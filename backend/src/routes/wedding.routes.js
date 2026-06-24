const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isOwner } = require('../middleware/auth.middleware');
const { createWeddingValidation, updateWeddingValidation, paginationValidation } = require('../middleware/validation.middleware');
const { uploadSingle, handleUploadError } = require('../middleware/upload.middleware');
const { generateWeddingSlug, paginate, buildPaginationMeta, daysUntilWedding } = require('../utils/helpers');
const { generateQRCode } = require('../utils/qrcode');
const { safeDeleteUploads } = require('../utils/fileCleanup');
const { recordTemplateUsage } = require('../utils/marketplace');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Print pricing (same as in printOrder.routes.js)
const PRINT_PRICING = {
  paperType: { standard: 0, premium: 0.50, luxury: 1.50 },
  finish: { mat: 0, glossy: 0.20, satin: 0.30 },
  size: { A6: 2.00, A5: 3.00, custom: 4.50 }
};

// Display name used in notifications/logs - couple names for weddings,
// the generic event title for everything else.
function eventDisplayName(wedding) {
  if (wedding.eventTitle) return wedding.eventTitle;
  if (wedding.brideName && wedding.groomName) return `${wedding.brideName} & ${wedding.groomName}`;
  return 'Événement';
}

function calculatePrintPrice(quantity, paperType, finish, size) {
  const basePrice = PRINT_PRICING.size[size] || PRINT_PRICING.size.A5;
  const paperExtra = PRINT_PRICING.paperType[paperType] || 0;
  const finishExtra = PRINT_PRICING.finish[finish] || 0;
  const unitPrice = basePrice + paperExtra + finishExtra;
  let discount = 0;
  if (quantity >= 200) discount = 0.20;
  else if (quantity >= 100) discount = 0.15;
  else if (quantity >= 50) discount = 0.10;
  const total = unitPrice * quantity * (1 - discount);
  return Math.round(total * 100) / 100;
}

/**
 * @route   POST /api/weddings
 * @desc    Create a new wedding project
 * @access  Private
 */
router.post('/', authenticate, createWeddingValidation, async (req, res) => {
  try {
    const {
      eventType,
      eventTitle,
      brideName,
      groomName,
      weddingDate,
      ceremonyTime,
      receptionTime,
      venueName,
      venueAddress,
      venueCity,
      venueCountry,
      customMessage,
      primaryColor,
      secondaryColor,
      fontFamily,
      templateId,
      planId,
      // Programme du mariage
      program,
      communeDate,
      communeTime,
      communeVenue,
      communeAddress,
      egliseDate,
      egliseTime,
      egliseVenue,
      egliseAddress,
      receptionDate,
      receptionStartTime,
      receptionVenue,
      receptionAddress,
      // Background
      backgroundImage,
      backgroundType,
      backgroundGradient,
      backgroundOpacity,
      // QR Code
      qrCodeStyle,
      qrCodeColor,
      qrCodeBgColor,
      qrCodeSize,
      // Print
      wantsPrintService,
      printQuantity,
      printPaperType,
      printFinish,
      printSize,
      printNotes,
      // Extra personalization
      dressCode,
      eventTheme,
      rsvpDeadline,
      additionalInfo,
      socialLinks
    } = req.body;

    // Generate unique slug - wedding events use bride & groom names,
    // everything else uses the generic event title
    const slug = (eventType && eventType !== 'WEDDING')
      ? generateWeddingSlug(eventTitle, eventType.toLowerCase())
      : generateWeddingSlug(brideName, groomName);

    // Create wedding
    const wedding = await prisma.wedding.create({
      data: {
        userId: req.user.id,
        eventType: eventType || 'WEDDING',
        eventTitle: eventTitle || null,
        brideName: brideName || null,
        groomName: groomName || null,
        weddingDate: new Date(weddingDate),
        ceremonyTime,
        receptionTime,
        venueName,
        venueAddress,
        venueCity,
        venueCountry,
        customMessage,
        primaryColor,
        secondaryColor,
        fontFamily,
        templateId,
        planId,
        slug,
        status: 'DRAFT',
        // Programme
        program: program || null,
        communeDate: communeDate ? new Date(communeDate) : null,
        communeTime,
        communeVenue,
        communeAddress,
        egliseDate: egliseDate ? new Date(egliseDate) : null,
        egliseTime,
        egliseVenue,
        egliseAddress,
        receptionDate: receptionDate ? new Date(receptionDate) : null,
        receptionStartTime,
        receptionVenue,
        receptionAddress,
        // Background
        backgroundImage: backgroundImage || null,
        backgroundType: backgroundType || 'color',
        backgroundGradient: backgroundGradient || null,
        backgroundOpacity: backgroundOpacity ?? 100,
        // QR Code
        qrCodeStyle: qrCodeStyle || 'classic',
        qrCodeColor: qrCodeColor || '#000000',
        qrCodeBgColor: qrCodeBgColor || '#FFFFFF',
        qrCodeSize: qrCodeSize || 300,
        // Print
        wantsPrintService: wantsPrintService || false,
        printQuantity: printQuantity || null,
        printPaperType: printPaperType || null,
        printFinish: printFinish || null,
        printSize: printSize || null,
        printNotes: printNotes || null,
        // Extra
        dressCode: dressCode || null,
        eventTheme: eventTheme || null,
        rsvpDeadline: rsvpDeadline ? new Date(rsvpDeadline) : null,
        additionalInfo: additionalInfo || null,
        socialLinks: socialLinks || null
      },
      include: {
        template: {
          select: { id: true, name: true, thumbnail: true }
        },
        plan: {
          select: { id: true, name: true, type: true }
        }
      }
    });

    // Log creation
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'CREATE',
        entity: 'wedding',
        entityId: wedding.id,
        details: { eventType: wedding.eventType, brideName, groomName, eventTitle }
      }
    });

    // If the chosen template is an approved marketplace template, record a
    // pending creator commission (approved once the wedding is activated).
    if (templateId) {
      await recordTemplateUsage({ templateId, weddingId: wedding.id, userId: req.user.id })
        .catch(err => logger.error('recordTemplateUsage failed on wedding create:', err));
    }

    // If print service is requested, create a print order
    if (wantsPrintService && printQuantity && printQuantity >= 10) {
      const printPrice = calculatePrintPrice(
        printQuantity,
        printPaperType || 'premium',
        printFinish || 'mat',
        printSize || 'A5'
      );

      const printOrder = await prisma.printOrder.create({
        data: {
          weddingId: wedding.id,
          userId: req.user.id,
          quantity: printQuantity,
          paperType: printPaperType || 'premium',
          finish: printFinish || 'mat',
          size: printSize || 'A5',
          notes: printNotes,
          price: printPrice
        }
      });

      // Notify all admins about new print order
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        select: { id: true }
      });

      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: 'NEW_PRINT_ORDER',
          title: 'Nouvelle commande d\'impression',
          message: `${req.user.firstName} ${req.user.lastName} a demandé l'impression de ${printQuantity} invitations pour "${eventDisplayName(wedding)}".`,
          data: { orderId: printOrder.id, weddingId: wedding.id }
        }))
      });

      logger.info(`Print order created for wedding ${wedding.id}: ${printQuantity} copies`);
    }

    res.status(201).json({
      message: 'Projet de mariage créé avec succès',
      wedding
    });
  } catch (error) {
    logger.error('Create wedding error:', error);
    res.status(500).json({ error: 'Erreur lors de la création du projet' });
  }
});

/**
 * @route   GET /api/weddings
 * @desc    Get all weddings for current user
 * @access  Private
 */
router.get('/', authenticate, paginationValidation, async (req, res) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const { status, search } = req.query;

    const where = {
      userId: req.user.id,
      ...(status && { status }),
      ...(search && {
        OR: [
          { brideName: { contains: search } },
          { groomName: { contains: search } },
          { eventTitle: { contains: search } }
        ]
      })
    };

    const [weddings, total] = await Promise.all([
      prisma.wedding.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          template: {
            select: { id: true, name: true, thumbnail: true }
          },
          plan: {
            select: { id: true, name: true, type: true }
          },
          _count: {
            select: {
              guests: true,
              invitations: true
            }
          }
        }
      }),
      prisma.wedding.count({ where })
    ]);

    // Add computed fields
    const weddingsWithExtras = weddings.map(w => ({
      ...w,
      daysUntil: daysUntilWedding(w.weddingDate)
    }));

    res.json({
      weddings: weddingsWithExtras,
      pagination: buildPaginationMeta(total, page, limit)
    });
  } catch (error) {
    logger.error('Get weddings error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des projets' });
  }
});

/**
 * @route   GET /api/weddings/:id
 * @desc    Get single wedding by ID
 * @access  Private
 */
router.get('/:id', authenticate, isOwner(), async (req, res) => {
  try {
    const wedding = await prisma.wedding.findFirst({
      where: {
        id: req.params.id,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      },
      include: {
        template: true,
        plan: true,
        guests: {
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
        },
        _count: {
          select: {
            guests: true,
            invitations: true,
            payments: true,
            checkIns: true
          }
        }
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    // Calculate statistics
    const stats = {
      totalGuests: wedding.guests.length,
      confirmedGuests: wedding.guests.filter(g => g.rsvpStatus === 'CONFIRMED').length,
      declinedGuests: wedding.guests.filter(g => g.rsvpStatus === 'DECLINED').length,
      pendingGuests: wedding.guests.filter(g => g.rsvpStatus === 'PENDING').length,
      invitationsSent: wedding.guests.filter(g => g.invitationSent).length,
      daysUntil: daysUntilWedding(wedding.weddingDate)
    };

    res.json({ wedding, stats });
  } catch (error) {
    logger.error('Get wedding error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du projet' });
  }
});

/**
 * @route   PUT /api/weddings/:id
 * @desc    Update wedding
 * @access  Private
 */
router.put('/:id', authenticate, isOwner(), updateWeddingValidation, async (req, res) => {
  try {
    const {
      eventType,
      eventTitle,
      brideName,
      groomName,
      weddingDate,
      ceremonyTime,
      receptionTime,
      venueName,
      venueAddress,
      venueCity,
      venueCountry,
      venueMapUrl,
      customMessage,
      primaryColor,
      secondaryColor,
      fontFamily,
      templateId,
      musicUrl,
      // Programme du mariage
      program,
      communeDate,
      communeTime,
      communeVenue,
      communeAddress,
      egliseDate,
      egliseTime,
      egliseVenue,
      egliseAddress,
      receptionDate,
      receptionStartTime,
      receptionVenue,
      receptionAddress,
      // Print service
      wantsPrintService,
      printQuantity,
      printPaperType,
      printFinish,
      printSize,
      printNotes,
      // Background & extra
      backgroundImage,
      backgroundType,
      backgroundGradient,
      backgroundOpacity,
      textColor,
      bgColor,
      dressCode,
      eventTheme,
      rsvpDeadline,
      additionalInfo,
      socialLinks,
      // QR Code
      qrCodeStyle,
      qrCodeColor,
      qrCodeBgColor,
      qrCodeSize,
      // Tables
      tables,
      // Multi-image templates
      templateImages
    } = req.body;

    // Get current wedding state before update
    const currentWedding = await prisma.wedding.findUnique({
      where: { id: req.params.id },
      select: { wantsPrintService: true, brideName: true, groomName: true, eventTitle: true }
    });

    const wedding = await prisma.wedding.update({
      where: { id: req.params.id },
      data: {
        ...(eventType && { eventType }),
        ...(eventTitle !== undefined && { eventTitle }),
        ...(brideName && { brideName }),
        ...(groomName && { groomName }),
        ...(weddingDate && { weddingDate: new Date(weddingDate) }),
        ...(ceremonyTime !== undefined && { ceremonyTime }),
        ...(receptionTime !== undefined && { receptionTime }),
        ...(venueName !== undefined && { venueName }),
        ...(venueAddress !== undefined && { venueAddress }),
        ...(venueCity !== undefined && { venueCity }),
        ...(venueCountry !== undefined && { venueCountry }),
        ...(venueMapUrl !== undefined && { venueMapUrl }),
        ...(customMessage !== undefined && { customMessage }),
        ...(primaryColor && { primaryColor }),
        ...(secondaryColor && { secondaryColor }),
        ...(textColor !== undefined && { textColor: textColor || null }),
        ...(bgColor !== undefined && { bgColor: bgColor || null }),
        ...(fontFamily && { fontFamily }),
        ...(templateId !== undefined && { templateId: templateId || null }),
        ...(musicUrl !== undefined && { musicUrl }),
        // Programme
        ...(program !== undefined && { program }),
        ...(communeDate !== undefined && { communeDate: communeDate ? new Date(communeDate) : null }),
        ...(communeTime !== undefined && { communeTime }),
        ...(communeVenue !== undefined && { communeVenue }),
        ...(communeAddress !== undefined && { communeAddress }),
        ...(egliseDate !== undefined && { egliseDate: egliseDate ? new Date(egliseDate) : null }),
        ...(egliseTime !== undefined && { egliseTime }),
        ...(egliseVenue !== undefined && { egliseVenue }),
        ...(egliseAddress !== undefined && { egliseAddress }),
        ...(receptionDate !== undefined && { receptionDate: receptionDate ? new Date(receptionDate) : null }),
        ...(receptionStartTime !== undefined && { receptionStartTime }),
        ...(receptionVenue !== undefined && { receptionVenue }),
        ...(receptionAddress !== undefined && { receptionAddress }),
        // Background
        ...(backgroundImage !== undefined && { backgroundImage: backgroundImage || null }),
        ...(backgroundType !== undefined && { backgroundType: backgroundType || 'color' }),
        ...(backgroundGradient !== undefined && { backgroundGradient: backgroundGradient || null }),
        ...(backgroundOpacity !== undefined && { backgroundOpacity: parseInt(backgroundOpacity) || 100 }),
        // Extra
        ...(dressCode !== undefined && { dressCode: dressCode || null }),
        ...(eventTheme !== undefined && { eventTheme: eventTheme || null }),
        ...(rsvpDeadline !== undefined && { rsvpDeadline: rsvpDeadline ? new Date(rsvpDeadline) : null }),
        ...(additionalInfo !== undefined && { additionalInfo: additionalInfo || null }),
        ...(socialLinks !== undefined && { socialLinks: socialLinks || null }),
        // QR Code
        ...(qrCodeStyle !== undefined && { qrCodeStyle }),
        ...(qrCodeColor !== undefined && { qrCodeColor }),
        ...(qrCodeBgColor !== undefined && { qrCodeBgColor }),
        ...(qrCodeSize !== undefined && { qrCodeSize: parseInt(qrCodeSize) || 300 }),
        // Print service
        ...(wantsPrintService !== undefined && { wantsPrintService }),
        ...(printQuantity !== undefined && { printQuantity }),
        ...(printPaperType !== undefined && { printPaperType }),
        ...(printFinish !== undefined && { printFinish }),
        ...(printSize !== undefined && { printSize }),
        ...(printNotes !== undefined && { printNotes }),
        // Tables
        ...(tables !== undefined && { tables }),
        // Multi-image templates
        ...(templateImages !== undefined && { templateImages })
      },
      include: {
        template: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } }
      }
    });

    // If print service newly enabled, create a print order
    if (wantsPrintService && !currentWedding.wantsPrintService && printQuantity && printQuantity >= 10) {
      // Check if there's no pending print order for this wedding
      const existingOrder = await prisma.printOrder.findFirst({
        where: { 
          weddingId: wedding.id,
          status: { in: ['PENDING', 'CONFIRMED', 'PRINTING'] }
        }
      });

      if (!existingOrder) {
        const printPrice = calculatePrintPrice(
          printQuantity,
          printPaperType || 'premium',
          printFinish || 'mat',
          printSize || 'A5'
        );

        const printOrder = await prisma.printOrder.create({
          data: {
            weddingId: wedding.id,
            userId: req.user.id,
            quantity: printQuantity,
            paperType: printPaperType || 'premium',
            finish: printFinish || 'mat',
            size: printSize || 'A5',
            notes: printNotes,
            price: printPrice
          }
        });

        // Notify all admins about new print order
        const admins = await prisma.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
          select: { id: true }
        });

        const displayName = eventDisplayName({
          eventTitle: eventTitle ?? currentWedding.eventTitle,
          brideName: brideName || currentWedding.brideName,
          groomName: groomName || currentWedding.groomName
        });

        await prisma.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            type: 'NEW_PRINT_ORDER',
            title: 'Nouvelle commande d\'impression',
            message: `${req.user.firstName} ${req.user.lastName} a demandé l'impression de ${printQuantity} invitations pour "${displayName}".`,
            data: { orderId: printOrder.id, weddingId: wedding.id }
          }))
        });

        logger.info(`Print order created for wedding ${wedding.id}: ${printQuantity} copies`);
      }
    }

    // Log update
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'wedding',
        entityId: wedding.id
      }
    });

    res.json({
      message: 'Projet mis à jour avec succès',
      wedding
    });
  } catch (error) {
    logger.error('Update wedding error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

/**
 * @route   GET /api/weddings/:id/tables
 * @desc    Get wedding table names
 * @access  Private
 */
router.get('/:id/tables', authenticate, isOwner(), async (req, res) => {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { id: req.params.id },
      select: { tables: true }
    });

    res.json({ tables: wedding?.tables || [] });
  } catch (error) {
    logger.error('Get tables error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/weddings/:id/tables
 * @desc    Save wedding table names
 * @access  Private
 */
router.put('/:id/tables', authenticate, isOwner(), async (req, res) => {
  try {
    const { tables } = req.body;

    if (!Array.isArray(tables)) {
      return res.status(400).json({ error: 'Les tables doivent être un tableau' });
    }

    // Clean & deduplicate
    const cleanTables = [...new Set(tables.map(t => String(t).trim()).filter(Boolean))];

    await prisma.wedding.update({
      where: { id: req.params.id },
      data: { tables: cleanTables }
    });

    res.json({ message: 'Tables enregistrées', tables: cleanTables });
  } catch (error) {
    logger.error('Save tables error:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde des tables' });
  }
});

/**
 * @route   POST /api/weddings/:id/cover
 * @desc    Upload cover photo
 * @access  Private
 */
router.post('/:id/cover', authenticate, isOwner(), uploadSingle('cover'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image uploadée' });
    }

    const coverPath = `/uploads/covers/${req.file.filename}`;

    const wedding = await prisma.wedding.update({
      where: { id: req.params.id },
      data: { coverPhoto: coverPath }
    });

    res.json({
      message: 'Photo de couverture mise à jour',
      coverPhoto: coverPath
    });
  } catch (error) {
    logger.error('Upload cover error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

/**
 * @route   POST /api/weddings/:id/logo
 * @desc    Upload custom logo
 * @access  Private
 */
router.post('/:id/logo', authenticate, isOwner(), uploadSingle('logo'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image uploadée' });
    }

    const logoPath = `/uploads/logos/${req.file.filename}`;

    await prisma.wedding.update({
      where: { id: req.params.id },
      data: { logo: logoPath }
    });

    res.json({
      message: 'Logo mis à jour',
      logo: logoPath
    });
  } catch (error) {
    logger.error('Upload logo error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

/**
 * @route   DELETE /api/weddings/:id
 * @desc    Delete wedding
 * @access  Private
 */
router.delete('/:id', authenticate, isOwner(), async (req, res) => {
  try {
    // Gather the wedding's own uploaded assets + its invitations' generated
    // files so we can remove them from disk after the DB row is deleted.
    // Template images are shared across many weddings, so we explicitly exclude
    // them from deletion.
    const wedding = await prisma.wedding.findUnique({
      where: { id: req.params.id },
      include: {
        invitations: { select: { qrCodeUrl: true, pdfUrl: true } },
        template: { select: { backgroundUrl: true, previewImage: true, thumbnail: true } }
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    const galleryPhotos = Array.isArray(wedding.galleryPhotos) ? wedding.galleryPhotos : [];
    const templateImageUrls = (wedding.templateImages && typeof wedding.templateImages === 'object')
      ? Object.values(wedding.templateImages) : [];
    const weddingFiles = [
      wedding.coverPhoto,
      wedding.couplePhoto,
      wedding.logo,
      wedding.backgroundImage,
      wedding.qrCodeLogo,
      wedding.qrCodeUrl,
      ...galleryPhotos,
      ...templateImageUrls,
      ...wedding.invitations.flatMap(inv => [inv.qrCodeUrl, inv.pdfUrl])
    ];
    // Never delete shared template assets, even if a wedding field happens to
    // point at one.
    const sharedTemplateFiles = wedding.template
      ? [wedding.template.backgroundUrl, wedding.template.previewImage, wedding.template.thumbnail]
      : [];

    await prisma.wedding.delete({
      where: { id: req.params.id }
    });

    // Best-effort disk cleanup - runs after the row is gone, never blocks the response
    safeDeleteUploads(weddingFiles, sharedTemplateFiles)
      .then(count => { if (count) logger.info(`Deleted ${count} file(s) for wedding ${req.params.id}`); })
      .catch(err => logger.warn(`File cleanup for wedding ${req.params.id} failed: ${err.message}`));

    // Log deletion
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        entity: 'wedding',
        entityId: req.params.id
      }
    });

    res.json({ message: 'Projet supprimé avec succès' });
  } catch (error) {
    logger.error('Delete wedding error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

/**
 * @route   GET /api/weddings/:id/stats
 * @desc    Get wedding statistics
 * @access  Private
 */
router.get('/:id/stats', authenticate, isOwner(), async (req, res) => {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { id: req.params.id },
      include: {
        guests: true,
        invitations: true,
        checkIns: true
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    const stats = {
      totalGuests: wedding.guests.length,
      totalPlusOnes: wedding.guests.reduce((sum, g) => sum + g.plusOnes, 0),
      rsvp: {
        confirmed: wedding.guests.filter(g => g.rsvpStatus === 'CONFIRMED').length,
        declined: wedding.guests.filter(g => g.rsvpStatus === 'DECLINED').length,
        pending: wedding.guests.filter(g => g.rsvpStatus === 'PENDING').length
      },
      invitations: {
        generated: wedding.invitations.length,
        sent: wedding.guests.filter(g => g.invitationSent).length,
        viewed: wedding.guests.filter(g => g.invitationViewed).length
      },
      checkIns: {
        total: wedding.checkIns.length,
        unique: new Set(wedding.checkIns.map(c => c.guestId)).size
      },
      daysUntil: daysUntilWedding(wedding.weddingDate)
    };

    res.json({ stats });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

/**
 * @route   POST /api/weddings/:id/background
 * @desc    Upload custom background image
 * @access  Private
 */
router.post('/:id/background', authenticate, isOwner(), uploadSingle('background'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image uploadée' });
    }

    const bgPath = `/uploads/backgrounds/${req.file.filename}`;

    await prisma.wedding.update({
      where: { id: req.params.id },
      data: { backgroundImage: bgPath, backgroundType: 'image' }
    });

    res.json({ message: 'Arrière-plan mis à jour', backgroundImage: bgPath });
  } catch (error) {
    logger.error('Upload background error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

/**
 * @route   POST /api/weddings/:id/couple-photo
 * @desc    Upload couple photo
 * @access  Private
 */
router.post('/:id/couple-photo', authenticate, isOwner(), uploadSingle('couplePhoto'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image uploadée' });
    }

    const photoPath = `/uploads/couple-photos/${req.file.filename}`;

    await prisma.wedding.update({
      where: { id: req.params.id },
      data: { couplePhoto: photoPath }
    });

    res.json({ message: 'Photo de couple mise à jour', couplePhoto: photoPath });
  } catch (error) {
    logger.error('Upload couple photo error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

/**
 * @route   POST /api/weddings/:id/template-image
 * @desc    Upload one image for a specific photo placeholder of the template.
 *          Body must include `placeholderId` (the design element id). The URL
 *          is merged into the wedding's templateImages map so each placeholder
 *          keeps its own independent image.
 * @access  Private
 */
router.post('/:id/template-image', authenticate, isOwner(), uploadSingle('couplePhoto'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image uploadée' });
    }
    const placeholderId = req.body.placeholderId;
    if (!placeholderId) {
      return res.status(400).json({ error: 'placeholderId requis' });
    }

    const photoPath = `/uploads/couple-photos/${req.file.filename}`;

    const wedding = await prisma.wedding.findUnique({
      where: { id: req.params.id },
      select: { templateImages: true, couplePhoto: true }
    });

    const current = (wedding && wedding.templateImages && typeof wedding.templateImages === 'object')
      ? wedding.templateImages
      : {};
    const updatedImages = { ...current, [placeholderId]: photoPath };

    // Keep couplePhoto pointing at the first placeholder's image for backward
    // compatibility with anything still reading the legacy single-photo field.
    const data = { templateImages: updatedImages };
    if (!wedding || !wedding.couplePhoto) {
      data.couplePhoto = photoPath;
    }

    await prisma.wedding.update({ where: { id: req.params.id }, data });

    res.json({ message: 'Image mise à jour', url: photoPath, templateImages: updatedImages });
  } catch (error) {
    logger.error('Upload template image error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

/**
 * @route   POST /api/weddings/:id/qr-logo
 * @desc    Upload QR code logo
 * @access  Private
 */
router.post('/:id/qr-logo', authenticate, isOwner(), uploadSingle('qrLogo'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image uploadée' });
    }

    const logoPath = `/uploads/qr-logos/${req.file.filename}`;

    await prisma.wedding.update({
      where: { id: req.params.id },
      data: { qrCodeLogo: logoPath }
    });

    res.json({ message: 'Logo QR code mis à jour', qrCodeLogo: logoPath });
  } catch (error) {
    logger.error('Upload QR logo error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

module.exports = router;
