const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const { authenticate, isOwner } = require('../middleware/auth.middleware');
const { createGuestValidation, paginationValidation } = require('../middleware/validation.middleware');
const { uploadSingle, handleUploadError } = require('../middleware/upload.middleware');
const { paginate, buildPaginationMeta, parseCSV, mapCSVToGuest } = require('../utils/helpers');
const { generateQRCode, generateUniqueCode } = require('../utils/qrcode');
const { buildGuestShare, NoInvitationError } = require('../utils/guestMessaging');
const { eventUsesTables, eventUsesPlusOnes, getGuestCategoryOptions } = require('../utils/eventTypes');
const logger = require('../utils/logger');
const fs = require('fs').promises;

const prisma = new PrismaClient();

/**
 * @route   POST /api/guests/:weddingId
 * @desc    Add a guest to wedding
 * @access  Private
 */
router.post('/:weddingId', authenticate, createGuestValidation, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const { firstName, lastName, email, phone, tableNumber, category, plusOnes, dietaryRestrictions, notes } = req.body;

    // Verify wedding ownership
    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    // Check for duplicate email if provided
    if (email) {
      const existingGuest = await prisma.guest.findFirst({
        where: { weddingId, email }
      });
      if (existingGuest) {
        return res.status(400).json({ error: 'Un invitÃ© avec cet email existe dÃ©jÃ ' });
      }
    }

    const guest = await prisma.guest.create({
      data: {
        weddingId,
        firstName,
        lastName,
        email,
        phone,
        tableNumber,
        category: category || null,
        plusOnes: plusOnes || 0,
        dietaryRestrictions,
        notes
      }
    });

    // Update total guests count
    await prisma.wedding.update({
      where: { id: weddingId },
      data: { totalGuests: { increment: 1 + (plusOnes || 0) } }
    });

    res.status(201).json({
      message: 'InvitÃ© ajoutÃ© avec succÃ¨s',
      guest
    });
  } catch (error) {
    logger.error('Add guest error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'invitÃ©' });
  }
});

/**
 * @route   POST /api/guests/:weddingId/import
 * @desc    Import guests from CSV/Excel
 * @access  Private
 */
router.post('/:weddingId/import', authenticate, uploadSingle('file'), handleUploadError, async (req, res) => {
  try {
    const { weddingId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier uploadÃ©' });
    }

    // Verify wedding ownership
    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    let guests = [];
    const filePath = req.file.path;

    // Parse file based on extension
    if (req.file.originalname.endsWith('.csv')) {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = parseCSV(content);
      guests = parsed.map(mapCSVToGuest);
    } else if (req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls')) {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      
      guests = data.map(row => mapCSVToGuest(
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [k.toLowerCase(), v])
        )
      ));
    }

    // Filter valid guests
    const validGuests = guests.filter(g => g.firstName && g.lastName);

    if (validGuests.length === 0) {
      return res.status(400).json({ error: 'Aucun invitÃ© valide trouvÃ© dans le fichier' });
    }

    // Create guests
    const results = {
      created: 0,
      skipped: 0,
      errors: []
    };

    for (const guestData of validGuests) {
      try {
        // Check for duplicate email
        if (guestData.email) {
          const existing = await prisma.guest.findFirst({
            where: { weddingId, email: guestData.email }
          });
          if (existing) {
            results.skipped++;
            continue;
          }
        }

        await prisma.guest.create({
          data: {
            weddingId,
            ...guestData
          }
        });
        results.created++;
      } catch (err) {
        results.errors.push(`${guestData.firstName} ${guestData.lastName}: ${err.message}`);
      }
    }

    // Update total guests count
    const totalGuests = await prisma.guest.count({ where: { weddingId } });
    const totalPlusOnes = await prisma.guest.aggregate({
      where: { weddingId },
      _sum: { plusOnes: true }
    });

    await prisma.wedding.update({
      where: { id: weddingId },
      data: { totalGuests: totalGuests + (totalPlusOnes._sum.plusOnes || 0) }
    });

    // Clean up uploaded file
    await fs.unlink(filePath).catch(() => {});

    res.json({
      message: `Import terminÃ©: ${results.created} crÃ©Ã©s, ${results.skipped} ignorÃ©s`,
      results
    });
  } catch (error) {
    logger.error('Import guests error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'import' });
  }
});

/**
 * @route   GET /api/guests/:weddingId
 * @desc    Get all guests for a wedding
 * @access  Private
 */
router.get('/:weddingId', authenticate, paginationValidation, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const { status, search, table } = req.query;

    // Verify wedding ownership
    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    const where = {
      weddingId,
      ...(status && { rsvpStatus: status }),
      ...(table && { tableNumber: table }),
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } }
        ]
      })
    };

    const [guests, total] = await Promise.all([
      prisma.guest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          invitation: {
            select: {
              id: true,
              uniqueCode: true,
              qrCodeUrl: true,
              pdfUrl: true,
              viewCount: true
            }
          }
        }
      }),
      prisma.guest.count({ where })
    ]);

    res.json({
      guests,
      pagination: buildPaginationMeta(total, page, limit)
    });
  } catch (error) {
    logger.error('Get guests error:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃ©cupÃ©ration des invitÃ©s' });
  }
});

/**
 * @route   GET /api/guests/:weddingId/template
 * @desc    Download an Excel (.xlsx) import template, columns adapted to the
 *          event type, with an "Instructions" sheet (column meanings, valid
 *          categories, and the event's predefined tables).
 * @access  Private
 * NB: declared BEFORE GET /:weddingId/:guestId so "template" isn't read as a guestId.
 */
router.get('/:weddingId/template', authenticate, async (req, res) => {
  try {
    const wedding = await findOwnedWedding(req, req.params.weddingId);
    if (!wedding) return res.status(404).json({ error: 'Événement non trouvé' });

    const usesTables = eventUsesTables(wedding.eventType);
    const usesPlusOnes = eventUsesPlusOnes(wedding.eventType);
    const categories = getGuestCategoryOptions(wedding.eventType);
    const tables = Array.isArray(wedding.tables) ? wedding.tables : [];

    // Columns + one example row, matching the keys mapCSVToGuest understands.
    const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Catégorie'];
    const example = { 'Prénom': 'Jean', 'Nom': 'Dupont', 'Email': 'jean@email.com', 'Téléphone': '+221770000000', 'Catégorie': categories[0] || 'Amis' };
    if (usesTables) { headers.push('Table'); example['Table'] = tables[0] || '1'; }
    if (usesPlusOnes) { headers.push('Accompagnants'); example['Accompagnants'] = 1; }
    headers.push('Notes'); example['Notes'] = 'Invité VIP';

    const guestSheet = XLSX.utils.json_to_sheet([example], { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, guestSheet, 'Invités');

    // Human-readable instructions so the file is self-explanatory.
    const instr = [
      ['Comment remplir ce fichier'],
      ['1) Une ligne = un invité. Remplissez sous chaque colonne, gardez la 1re ligne (en-têtes).'],
      ['2) Enregistrez en .xlsx puis importez-le depuis la page Invités (bouton « Importer »).'],
      [''],
      ['Colonne', 'Description', 'Obligatoire'],
      ['Prénom', "Prénom de l'invité", 'Oui'],
      ['Nom', "Nom de l'invité", 'Oui'],
      ['Email', 'Adresse email (sert à éviter les doublons)', 'Non'],
      ['Téléphone', 'Numéro au format international, ex. +221770000000', 'Non'],
      ['Catégorie', 'Une des catégories valides ci-dessous', 'Non'],
      ...(usesTables ? [['Table', 'Nom/numéro de la table où placer l\'invité', 'Non']] : []),
      ...(usesPlusOnes ? [['Accompagnants', "Nombre d'accompagnants (0, 1, 2...)", 'Non']] : []),
      ['Notes', 'Remarque libre (régime, VIP, etc.)', 'Non'],
      [''],
      ['Catégories valides', categories.join(', ')],
      ...(usesTables ? [['Tables de l\'événement', tables.length ? tables.join(', ') : '(aucune table définie — ajoutez-les dans l\'édition de l\'événement)']] : [])
    ];
    const instrSheet = XLSX.utils.aoa_to_sheet(instr);
    instrSheet['!cols'] = [{ wch: 22 }, { wch: 60 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, instrSheet, 'Instructions');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=modele-invites-${(wedding.eventType || 'evenement').toLowerCase()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    logger.error('Guest template error:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du modèle' });
  }
});

/**
 * @route   GET /api/guests/:weddingId/:guestId
 * @desc    Get a single guest
 * @access  Private
 */
router.get('/:weddingId/:guestId', authenticate, async (req, res) => {
  try {
    const { weddingId, guestId } = req.params;

    // Verify wedding ownership
    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    const guest = await prisma.guest.findFirst({
      where: { id: guestId, weddingId },
      include: {
        invitation: {
          select: {
            id: true,
            uniqueCode: true,
            qrCodeUrl: true,
            pdfUrl: true,
            viewCount: true
          }
        },
        checkIns: {
          orderBy: { checkedInAt: 'desc' },
          take: 5
        }
      }
    });

    if (!guest) {
      return res.status(404).json({ error: 'InvitÃ© non trouvÃ©' });
    }

    res.json({ guest });
  } catch (error) {
    logger.error('Get guest error:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃ©cupÃ©ration de l\'invitÃ©' });
  }
});

/**
 * @route   POST /api/guests/:weddingId/bulk
 * @desc    Add multiple guests at once
 * @access  Private
 */
router.post('/:weddingId/bulk', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const { guests } = req.body;

    if (!guests || !Array.isArray(guests) || guests.length === 0) {
      return res.status(400).json({ error: 'Liste d\'invitÃ©s requise' });
    }

    // Verify wedding ownership
    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    const results = { created: 0, skipped: 0, errors: [] };

    for (const guestData of guests) {
      try {
        if (!guestData.firstName || !guestData.lastName) {
          results.skipped++;
          continue;
        }

        if (guestData.email) {
          const existing = await prisma.guest.findFirst({
            where: { weddingId, email: guestData.email }
          });
          if (existing) {
            results.skipped++;
            continue;
          }
        }

        await prisma.guest.create({
          data: {
            weddingId,
            firstName: guestData.firstName,
            lastName: guestData.lastName,
            email: guestData.email || null,
            phone: guestData.phone || null,
            tableNumber: guestData.tableNumber || null,
            category: guestData.category || null,
            plusOnes: guestData.plusOnes || 0,
            dietaryRestrictions: guestData.dietaryRestrictions || null,
            notes: guestData.notes || null
          }
        });
        results.created++;
      } catch (err) {
        results.errors.push(`${guestData.firstName} ${guestData.lastName}: ${err.message}`);
      }
    }

    // Update total guests count
    const totalGuests = await prisma.guest.count({ where: { weddingId } });
    const totalPlusOnes = await prisma.guest.aggregate({
      where: { weddingId },
      _sum: { plusOnes: true }
    });

    await prisma.wedding.update({
      where: { id: weddingId },
      data: { totalGuests: totalGuests + (totalPlusOnes._sum.plusOnes || 0) }
    });

    res.status(201).json({
      message: `${results.created} invitÃ©s ajoutÃ©s, ${results.skipped} ignorÃ©s`,
      results
    });
  } catch (error) {
    logger.error('Bulk add guests error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout en masse' });
  }
});

/**
 * @route   PUT /api/guests/:weddingId/:guestId
 * @desc    Update a guest
 * @access  Private
 */
router.put('/:weddingId/:guestId', authenticate, async (req, res) => {
  try {
    const { weddingId, guestId } = req.params;
    const { firstName, lastName, email, phone, tableNumber, category, plusOnes, dietaryRestrictions, notes, rsvpStatus } = req.body;

    // Verify wedding ownership
    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    const guest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(tableNumber !== undefined && { tableNumber }),
        ...(category !== undefined && { category }),
        ...(plusOnes !== undefined && { plusOnes }),
        ...(dietaryRestrictions !== undefined && { dietaryRestrictions }),
        ...(notes !== undefined && { notes }),
        ...(rsvpStatus && { rsvpStatus, rsvpDate: new Date() })
      }
    });

    res.json({
      message: 'InvitÃ© mis Ã  jour',
      guest
    });
  } catch (error) {
    logger.error('Update guest error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise Ã  jour' });
  }
});

/**
 * @route   DELETE /api/guests/:weddingId/:guestId
 * @desc    Delete a guest
 * @access  Private
 */
router.delete('/:weddingId/:guestId', authenticate, async (req, res) => {
  try {
    const { weddingId, guestId } = req.params;

    // Verify wedding ownership
    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    await prisma.guest.delete({
      where: { id: guestId }
    });

    res.json({ message: 'InvitÃ© supprimÃ©' });
  } catch (error) {
    logger.error('Delete guest error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

/**
 * @route   GET /api/guests/:weddingId/export
 * @desc    Export guests to Excel
 * @access  Private
 */
router.get('/:weddingId/export', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;

    // Verify wedding ownership
    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    const guests = await prisma.guest.findMany({
      where: { weddingId },
      include: {
        invitation: {
          select: { uniqueCode: true }
        }
      },
      orderBy: { lastName: 'asc' }
    });

    // Create Excel workbook
    const data = guests.map(g => ({
      'PrÃ©nom': g.firstName,
      'Nom': g.lastName,
      'Email': g.email || '',
      'TÃ©lÃ©phone': g.phone || '',
      'Table': g.tableNumber || '',
      'CatÃ©gorie': g.category || '',
      'Accompagnants': g.plusOnes,
      'Statut RSVP': g.rsvpStatus,
      'RÃ©gime alimentaire': g.dietaryRestrictions || '',
      'Notes': g.notes || '',
      'Code Invitation': g.invitation?.uniqueCode || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'InvitÃ©s');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=invites_${wedding.slug}.xlsx`);
    res.send(buffer);
  } catch (error) {
    logger.error('Export guests error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
});

/**
 * Helper: load a wedding the requester owns (or is staff for).
 */
async function findOwnedWedding(req, weddingId) {
  return prisma.wedding.findFirst({
    where: {
      id: weddingId,
      ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
    }
  });
}

/**
 * @route   GET /api/guests/:weddingId/:guestId/whatsapp
 * @desc    Build the personalized WhatsApp share link (+ message + invitation
 *          URL) for a single guest. Ensures the guest has an invitation code.
 * @access  Private
 */
router.get('/:weddingId/:guestId/whatsapp', authenticate, async (req, res) => {
  try {
    const { weddingId, guestId } = req.params;
    const wedding = await findOwnedWedding(req, weddingId);
    if (!wedding) return res.status(404).json({ error: 'Mariage non trouvé' });

    const guest = await prisma.guest.findFirst({
      where: { id: guestId, weddingId },
      include: { invitation: true }
    });
    if (!guest) return res.status(404).json({ error: 'Invité non trouvé' });

    const share = await buildGuestShare(wedding, guest);
    res.json(share);
  } catch (error) {
    if (error instanceof NoInvitationError || error.code === 'NO_INVITATION') {
      return res.status(400).json({ error: 'Générez d\'abord l\'invitation de cet invité (page Invitations) avant de l\'envoyer.', code: 'NO_INVITATION' });
    }
    logger.error('Guest whatsapp link error:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du lien WhatsApp' });
  }
});

/**
 * @route   GET /api/guests/:weddingId/whatsapp/bulk
 * @desc    Build WhatsApp share links for many guests at once (optionally
 *          filtered by RSVP status, e.g. only PENDING). Ensures invitation
 *          codes for all of them.
 *          NB: 3 segments so it isn't shadowed by GET /:weddingId/:guestId.
 * @access  Private
 */
router.get('/:weddingId/whatsapp/bulk', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const { status, onlyUnsent } = req.query;
    const wedding = await findOwnedWedding(req, weddingId);
    if (!wedding) return res.status(404).json({ error: 'Mariage non trouvé' });

    const guests = await prisma.guest.findMany({
      where: {
        weddingId,
        ...(status && { rsvpStatus: status }),
        ...(onlyUnsent === 'true' && { invitationSent: false })
      },
      include: { invitation: true },
      orderBy: { createdAt: 'desc' }
    });

    const shares = [];
    for (const guest of guests) {
      try {
        shares.push(await buildGuestShare(wedding, guest));
      } catch (err) {
        // Guests without a generated invitation are expected — skip quietly.
        if (!(err instanceof NoInvitationError) && err.code !== 'NO_INVITATION') {
          logger.error(`Bulk whatsapp share failed for guest ${guest.id}:`, err);
        }
      }
    }
    res.json({ count: shares.length, shares });
  } catch (error) {
    logger.error('Guest whatsapp bulk error:', error);
    res.status(500).json({ error: 'Erreur lors de la génération des liens WhatsApp' });
  }
});

/**
 * @route   POST /api/guests/:weddingId/:guestId/mark-sent
 * @desc    Mark a guest's invitation as sent (called after the admin actually
 *          opens WhatsApp / shares the link).
 * @access  Private
 */
router.post('/:weddingId/:guestId/mark-sent', authenticate, async (req, res) => {
  try {
    const { weddingId, guestId } = req.params;
    const wedding = await findOwnedWedding(req, weddingId);
    if (!wedding) return res.status(404).json({ error: 'Mariage non trouvé' });

    const guest = await prisma.guest.findFirst({ where: { id: guestId, weddingId } });
    if (!guest) return res.status(404).json({ error: 'Invité non trouvé' });

    const updated = await prisma.guest.update({
      where: { id: guestId },
      data: { invitationSent: true, invitationSentAt: new Date() }
    });
    res.json({ id: updated.id, invitationSent: updated.invitationSent, invitationSentAt: updated.invitationSentAt });
  } catch (error) {
    logger.error('Mark guest sent error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

module.exports = router;
