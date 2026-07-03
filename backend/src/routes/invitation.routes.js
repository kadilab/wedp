const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth.middleware');
const { generateQRCode, generateUniqueCode, generateQRCodeBase64 } = require('../utils/qrcode');
const { generateInvitationPDF, generateBatchPDFs, generateInvitationImage, generatePrintLayoutPDF, calculateImposition } = require('../utils/pdf');
const { getWeddingQuota } = require('../utils/invitationQuota');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * @route   GET /api/invitations/:weddingId
 * @desc    Get all invitations for a wedding
 * @access  Private
 */
router.get('/:weddingId', authenticate, async (req, res) => {
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

    const invitations = await prisma.invitation.findMany({
      where: { weddingId },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            rsvpStatus: true,
            invitationSent: true,
            invitationSentAt: true,
            invitationViewed: true,
            invitationViewedAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ invitations });
  } catch (error) {
    logger.error('Get invitations error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/invitations/:weddingId/generate
 * @desc    Generate invitations for all guests without one
 * @access  Private
 */
router.post('/:weddingId/generate', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const { guestIds } = req.body;

    // Verify wedding ownership and status
    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      },
      include: {
        template: true
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    // Get guests without invitations (restrict to selected guestIds if provided)
    const guestsWithoutInvitation = await prisma.guest.findMany({
      where: {
        weddingId,
        invitation: null,
        ...(Array.isArray(guestIds) && guestIds.length > 0 && { id: { in: guestIds } })
      }
    });

    if (guestsWithoutInvitation.length === 0) {
      return res.json({ message: 'Tous les invitÃ©s ont dÃ©jÃ  une invitation', generated: 0 });
    }

    // Enforce invitation quota (1 free + approved purchases) — staff can bypass for support
    const isStaff = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    if (!isStaff) {
      const quota = await getWeddingQuota(weddingId);
      if (guestsWithoutInvitation.length > quota.remaining) {
        return res.status(403).json({
          error: "Quota d'invitations insuffisant",
          code: 'QUOTA_EXCEEDED',
          quota
        });
      }
    }

    const generated = [];
    const errors = [];

    for (const guest of guestsWithoutInvitation) {
      try {
        // Generate unique code
        const uniqueCode = generateUniqueCode();
        
        // Generate QR code with the event's configured style (colors + size)
        const qrResult = await generateQRCode(uniqueCode, wedding.slug, wedding);

        // Create invitation
        const invitation = await prisma.invitation.create({
          data: {
            weddingId,
            guestId: guest.id,
            uniqueCode,
            qrCodeData: qrResult.dataUrl,
            qrCodeUrl: qrResult.filePath,
            shortUrl: qrResult.url
          }
        });

        generated.push({
          guestId: guest.id,
          guestName: `${guest.firstName} ${guest.lastName}`,
          invitationId: invitation.id,
          uniqueCode
        });
      } catch (err) {
        errors.push({
          guestId: guest.id,
          guestName: `${guest.firstName} ${guest.lastName}`,
          error: err.message
        });
      }
    }

    // An event with generated invitations is live → promote it out of DRAFT.
    if (generated.length > 0) {
      await prisma.wedding.updateMany({
        where: { id: weddingId, status: 'DRAFT' },
        data: { status: 'ACTIVE' }
      });
    }

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`wedding-${weddingId}`).emit('invitations-generated', {
        count: generated.length,
        weddingId
      });
    }

    res.json({
      message: `${generated.length} invitations gÃ©nÃ©rÃ©es`,
      generated: generated.length,
      errors: errors.length,
      details: { generated, errors }
    });
  } catch (error) {
    logger.error('Generate invitations error:', error);
    res.status(500).json({ error: 'Erreur lors de la gÃ©nÃ©ration des invitations' });
  }
});

/**
 * @route   POST /api/invitations/:weddingId/generate-pdfs
 * @desc    Generate PDF for all invitations
 * @access  Private
 */
router.post('/:weddingId/generate-pdfs', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const { guestIds } = req.body;

    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      },
      include: {
        template: true,
        guests: {
          include: {
            invitation: true
          }
        }
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    // Filter guests with invitations
    let guestsWithInvitations = wedding.guests.filter(g => g.invitation);
    
    // If specific guestIds provided, filter further
    if (guestIds && Array.isArray(guestIds) && guestIds.length > 0) {
      guestsWithInvitations = guestsWithInvitations.filter(g => guestIds.includes(g.id));
    }
    
    if (guestsWithInvitations.length === 0) {
      return res.status(400).json({ error: 'Aucune invitation Ã  traiter. GÃ©nÃ©rez d\'abord les invitations.' });
    }

    const pdfs = [];
    const errors = [];

    logger.info(`Starting PDF generation for wedding ${weddingId}, ${guestsWithInvitations.length} guest(s) to process`);

    for (const guest of guestsWithInvitations) {
      try {
        const pdfPath = await generateInvitationPDF({
          wedding,
          guest,
          invitation: guest.invitation,
          template: wedding.template,
          qrCodeDataUrl: guest.invitation.qrCodeData
        });

        // Update invitation with PDF path
        await prisma.invitation.update({
          where: { id: guest.invitation.id },
          data: { pdfUrl: pdfPath }
        });

        logger.info(`PDF generated for guest ${guest.firstName} ${guest.lastName}: ${pdfPath}`);

        pdfs.push({
          guestId: guest.id,
          guestName: `${guest.firstName} ${guest.lastName}`,
          pdfPath
        });
      } catch (err) {
        logger.error(`PDF generation failed for guest ${guest.firstName} ${guest.lastName}: ${err.message}`);
        errors.push({
          guestId: guest.id,
          guestName: `${guest.firstName} ${guest.lastName}`,
          error: err.message
        });
      }
    }

    logger.info(`PDF generation complete for wedding ${weddingId}: ${pdfs.length} generated, ${errors.length} errors`);

    res.json({
      message: `${pdfs.length} PDFs gÃ©nÃ©rÃ©s`,
      generated: pdfs.length,
      errors: errors.length,
      details: { pdfs, errors }
    });
  } catch (error) {
    logger.error('Generate PDFs error:', error);
    res.status(500).json({ error: 'Erreur lors de la gÃ©nÃ©ration des PDFs' });
  }
});

/**
 * @route   POST /api/invitations/:weddingId/generate-images
 * @desc    Generate image for all invitations
 * @access  Private
 */
router.post('/:weddingId/generate-images', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const { guestIds } = req.body;

    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      },
      include: {
        template: true,
        guests: {
          include: {
            invitation: true
          }
        }
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    // Filter guests with invitations
    let guestsWithInvitations = wedding.guests.filter(g => g.invitation);
    
    // If specific guestIds provided, filter further
    if (guestIds && Array.isArray(guestIds) && guestIds.length > 0) {
      guestsWithInvitations = guestsWithInvitations.filter(g => guestIds.includes(g.id));
    }
    
    if (guestsWithInvitations.length === 0) {
      return res.status(400).json({ error: 'Aucune invitation Ã  traiter. GÃ©nÃ©rez d\'abord les invitations.' });
    }

    const images = [];
    const errors = [];

    logger.info(`Starting IMAGE generation for wedding ${weddingId}, ${guestsWithInvitations.length} guest(s) to process`);

    for (const guest of guestsWithInvitations) {
      try {
        const imagePath = await generateInvitationImage({
          wedding,
          guest,
          invitation: guest.invitation,
          template: wedding.template,
          qrCodeDataUrl: guest.invitation.qrCodeData
        });

        // Update invitation with image path
        await prisma.invitation.update({
          where: { id: guest.invitation.id },
          data: { imageUrl: imagePath }
        });

        logger.info(`Image generated for guest ${guest.firstName} ${guest.lastName}: ${imagePath}`);

        images.push({
          guestId: guest.id,
          guestName: `${guest.firstName} ${guest.lastName}`,
          imagePath
        });
      } catch (err) {
        logger.error(`Image generation failed for guest ${guest.firstName} ${guest.lastName}: ${err.message}`);
        errors.push({
          guestId: guest.id,
          guestName: `${guest.firstName} ${guest.lastName}`,
          error: err.message
        });
      }
    }

    logger.info(`Image generation complete for wedding ${weddingId}: ${images.length} generated, ${errors.length} errors`);

    res.json({
      message: `${images.length} images gÃ©nÃ©rÃ©es`,
      generated: images.length,
      errors: errors.length,
      details: { images, errors }
    });
  } catch (error) {
    logger.error('Generate Images error:', error);
    res.status(500).json({ error: 'Erreur lors de la gÃ©nÃ©ration des images' });
  }
});

/**
 * @route   GET /api/invitations/:weddingId/download-all
 * @desc    Download all PDFs or Images as ZIP
 * @access  Private
 */
router.get('/:weddingId/download-all', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const { type = 'pdf' } = req.query; // 'pdf' or 'image'
    // Optional selection: only include these guests' invitations (comma-separated).
    const selectedIds = String(req.query.guestIds || '').split(',').map(s => s.trim()).filter(Boolean);
    const selectedSet = selectedIds.length ? new Set(selectedIds) : null;

    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      },
      include: {
        guests: {
          include: {
            invitation: true
          }
        }
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    // Restrict to the selected guests when a selection was provided.
    const eligibleGuests = selectedSet ? wedding.guests.filter(g => selectedSet.has(g.id)) : wedding.guests;

    let filesToDownload;
    let fileExtension;
    let errorMessage;

    if (type === 'image') {
      filesToDownload = eligibleGuests
        .filter(g => g.invitation?.imageUrl)
        .map(g => ({
          name: `${g.firstName}_${g.lastName}.png`,
          path: path.join(__dirname, '../../', g.invitation.imageUrl)
        }));
      fileExtension = 'images';
      errorMessage = 'Aucune image disponible. Générez d\'abord les images.';
    } else {
      filesToDownload = eligibleGuests
        .filter(g => g.invitation?.pdfUrl)
        .map(g => ({
          name: `${g.firstName}_${g.lastName}.pdf`,
          path: path.join(__dirname, '../../', g.invitation.pdfUrl)
        }));
      fileExtension = 'pdfs';
      errorMessage = 'Aucun PDF disponible. Générez d\'abord les PDFs.';
    }

    if (filesToDownload.length === 0) {
      return res.status(400).json({ error: errorMessage });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=invitations_${fileExtension}_${wedding.slug}.zip`);

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    for (const file of filesToDownload) {
      if (fs.existsSync(file.path)) {
        archive.file(file.path, { name: file.name });
      }
    }

    await archive.finalize();
  } catch (error) {
    logger.error('Download all error:', error);
    res.status(500).json({ error: 'Erreur lors du tÃ©lÃ©chargement' });
  }
});

/**
 * @route   POST /api/invitations/:weddingId/print-layout
 * @desc    Generate a print-ready imposition PDF ("BàT" / bon à tirer) for the
 *          SELECTED invitations only. Multiple cards per A4 page with crop marks.
 *          Declared before /:weddingId/:guestId so "print-layout" isn't captured
 *          as a guestId.
 * @access  Private (owner)
 */
router.post('/:weddingId/print-layout', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const { guestIds, printSize = 'A6' } = req.body;
    const ids = Array.isArray(guestIds) ? guestIds.filter(Boolean) : [];

    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      },
      include: {
        template: true,
        guests: {
          where: { invitation: { isNot: null }, ...(ids.length ? { id: { in: ids } } : {}) },
          include: { invitation: true }
        }
      }
    });

    if (!wedding) return res.status(404).json({ error: 'Événement non trouvé' });
    if (wedding.guests.length === 0) {
      return res.status(400).json({ error: 'Aucune invitation générée dans la sélection. Générez d\'abord les invitations.' });
    }

    const size = ['A6', 'A5', 'custom'].includes(printSize) ? printSize : 'A6';
    const pdfUrl = await generatePrintLayoutPDF({
      wedding,
      guests: wedding.guests,
      template: wedding.template,
      printSize: size
    });

    res.json({ pdfUrl, count: wedding.guests.length, size });
  } catch (error) {
    logger.error('Client print-layout error:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du fichier d\'impression' });
  }
});

/**
 * @route   GET /api/invitations/:weddingId/:guestId
 * @desc    Get specific invitation
 * @access  Private
 */
router.get('/:weddingId/:guestId', authenticate, async (req, res) => {
  try {
    const { weddingId, guestId } = req.params;

    const invitation = await prisma.invitation.findFirst({
      where: {
        weddingId,
        guestId
      },
      include: {
        guest: true,
        wedding: {
          select: {
            brideName: true,
            groomName: true,
            weddingDate: true,
            slug: true
          }
        }
      }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation non trouvÃ©e' });
    }

    res.json({ invitation });
  } catch (error) {
    logger.error('Get invitation error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/invitations/:weddingId/:guestId/regenerate
 * @desc    Regenerate QR code for specific guest
 * @access  Private
 */
router.post('/:weddingId/:guestId/regenerate', authenticate, async (req, res) => {
  try {
    const { weddingId, guestId } = req.params;

    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    // Generate new code with the event's configured QR style (colors + size)
    const uniqueCode = generateUniqueCode();
    const qrResult = await generateQRCode(uniqueCode, wedding.slug, wedding);

    // Update or create invitation
    const invitation = await prisma.invitation.upsert({
      where: { guestId },
      update: {
        uniqueCode,
        qrCodeData: qrResult.dataUrl,
        qrCodeUrl: qrResult.filePath,
        shortUrl: qrResult.url,
        pdfUrl: null // Reset PDF
      },
      create: {
        weddingId,
        guestId,
        uniqueCode,
        qrCodeData: qrResult.dataUrl,
        qrCodeUrl: qrResult.filePath,
        shortUrl: qrResult.url
      }
    });

    res.json({
      message: 'QR code rÃ©gÃ©nÃ©rÃ©',
      invitation
    });
  } catch (error) {
    logger.error('Regenerate QR error:', error);
    res.status(500).json({ error: 'Erreur lors de la rÃ©gÃ©nÃ©ration' });
  }
});

module.exports = router;
