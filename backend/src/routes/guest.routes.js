const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const { authenticate, isOwner } = require('../middleware/auth.middleware');
const { createGuestValidation, paginationValidation } = require('../middleware/validation.middleware');
const { uploadSingle, handleUploadError } = require('../middleware/upload.middleware');
const { paginate, buildPaginationMeta, parseCSV, mapCSVToGuest } = require('../utils/helpers');
const { generateQRCode, generateUniqueCode } = require('../utils/qrcode');
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
    const { firstName, lastName, email, phone, tableNumber, plusOnes, dietaryRestrictions, notes } = req.body;

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
    const { firstName, lastName, email, phone, tableNumber, plusOnes, dietaryRestrictions, notes, rsvpStatus } = req.body;

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

module.exports = router;
