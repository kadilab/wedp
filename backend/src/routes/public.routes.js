const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { createNotification, NotificationTemplates } = require('../utils/notifications');
const { eventDisplayName } = require('../utils/helpers');

const prisma = new PrismaClient();

/**
 * @route   GET /i/:weddingSlug/:invitationCode
 * @desc    View public invitation
 * @access  Public
 */
router.get('/:weddingSlug/:invitationCode', async (req, res) => {
  try {
    const { weddingSlug, invitationCode } = req.params;

    const wedding = await prisma.wedding.findUnique({
      where: { slug: weddingSlug },
      include: {
        template: true
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Invitation non trouvée' });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { uniqueCode: invitationCode },
      include: {
        guest: true
      }
    });

    if (!invitation || invitation.weddingId !== wedding.id) {
      return res.status(404).json({ error: 'Invitation non trouvée' });
    }

    // Update view count
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date()
      }
    });

    // Update guest viewed status if first time
    if (!invitation.guest.invitationViewed) {
      await prisma.guest.update({
        where: { id: invitation.guestId },
        data: {
          invitationViewed: true,
          invitationViewedAt: new Date()
        }
      });
    }

    // Prepare data for template
    const invitationData = {
      wedding: {
        eventType: wedding.eventType,
        eventTitle: wedding.eventTitle,
        brideName: wedding.brideName,
        groomName: wedding.groomName,
        weddingDate: wedding.weddingDate,
        ceremonyTime: wedding.ceremonyTime,
        receptionTime: wedding.receptionTime,
        venueName: wedding.venueName,
        venueAddress: wedding.venueAddress,
        venueCity: wedding.venueCity,
        venueMapUrl: wedding.venueMapUrl,
        customMessage: wedding.customMessage,
        primaryColor: wedding.primaryColor,
        secondaryColor: wedding.secondaryColor,
        fontFamily: wedding.fontFamily,
        coverPhoto: wedding.coverPhoto,
        couplePhoto: wedding.couplePhoto,
        templateImages: wedding.templateImages,
        logo: wedding.logo,
        musicUrl: wedding.musicUrl,
        // Background settings
        backgroundType: wedding.backgroundType,
        backgroundImage: wedding.backgroundImage,
        backgroundGradient: wedding.backgroundGradient,
        backgroundOpacity: wedding.backgroundOpacity,
        // Program/ceremony details
        communeDate: wedding.communeDate,
        communeTime: wedding.communeTime,
        communeVenue: wedding.communeVenue,
        communeAddress: wedding.communeAddress,
        egliseDate: wedding.egliseDate,
        egliseTime: wedding.egliseTime,
        egliseVenue: wedding.egliseVenue,
        egliseAddress: wedding.egliseAddress,
        receptionDate: wedding.receptionDate,
        receptionStartTime: wedding.receptionStartTime,
        receptionVenue: wedding.receptionVenue,
        receptionAddress: wedding.receptionAddress,
        // Extras
        dressCode: wedding.dressCode,
        eventTheme: wedding.eventTheme,
        socialLinks: wedding.socialLinks,
        additionalInfo: wedding.additionalInfo,
        rsvpDeadline: wedding.rsvpDeadline,
        bgColor: wedding.bgColor,
        textColor: wedding.textColor,
        qrCodeSize: wedding.qrCodeSize,
        qrCodeStyle: wedding.qrCodeStyle,
        qrCodeColor: wedding.qrCodeColor,
        qrCodeBgColor: wedding.qrCodeBgColor
      },
      guest: {
        firstName: invitation.guest.firstName,
        lastName: invitation.guest.lastName,
        fullName: `${invitation.guest.firstName} ${invitation.guest.lastName}`,
        tableNumber: invitation.guest.tableNumber,
        plusOnes: invitation.guest.plusOnes,
        rsvpStatus: invitation.guest.rsvpStatus
      },
      invitation: {
        uniqueCode: invitation.uniqueCode,
        qrCodeUrl: invitation.qrCodeUrl,
        qrCodeData: invitation.qrCodeData
      },
      template: wedding.template
    };

    res.json({ invitation: invitationData });
  } catch (error) {
    logger.error('View invitation error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /i/:weddingSlug/:invitationCode/rsvp
 * @desc    Submit RSVP response
 * @access  Public
 */
router.post('/:weddingSlug/:invitationCode/rsvp', async (req, res) => {
  try {
    const { weddingSlug, invitationCode } = req.params;
    const { response, message, plusOnes } = req.body;

    if (!['CONFIRMED', 'DECLINED'].includes(response)) {
      return res.status(400).json({ error: 'Réponse invalide' });
    }

    const wedding = await prisma.wedding.findUnique({
      where: { slug: weddingSlug }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvé' });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { uniqueCode: invitationCode }
    });

    if (!invitation || invitation.weddingId !== wedding.id) {
      return res.status(404).json({ error: 'Invitation non trouvée' });
    }

    // Get current guest status before update
    const currentGuest = await prisma.guest.findUnique({
      where: { id: invitation.guestId }
    });
    const previousStatus = currentGuest?.rsvpStatus;

    // Update guest RSVP
    const guest = await prisma.guest.update({
      where: { id: invitation.guestId },
      data: {
        rsvpStatus: response,
        rsvpDate: new Date(),
        rsvpMessage: message || null,
        ...(plusOnes !== undefined && { plusOnes })
      }
    });

    // Update wedding confirmed count (avoid double-counting)
    const effectivePlusOnes = plusOnes !== undefined ? plusOnes : guest.plusOnes;
    if (response === 'CONFIRMED' && previousStatus !== 'CONFIRMED') {
      await prisma.wedding.update({
        where: { id: wedding.id },
        data: {
          confirmedGuests: { increment: 1 + effectivePlusOnes }
        }
      });
    } else if (response === 'DECLINED' && previousStatus === 'CONFIRMED') {
      // Decrement if changing from CONFIRMED to DECLINED
      const previousPlusOnes = currentGuest?.plusOnes || 0;
      await prisma.wedding.update({
        where: { id: wedding.id },
        data: {
          confirmedGuests: { decrement: 1 + previousPlusOnes }
        }
      });
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`wedding-${wedding.id}`).emit('rsvp-updated', {
        weddingId: wedding.id,
        guestId: guest.id,
        guestName: `${guest.firstName} ${guest.lastName}`,
        response
      });
    }

    // Notify wedding owner
    const rsvpNotif = NotificationTemplates.rsvpReceived(
      `${guest.firstName} ${guest.lastName}`,
      eventDisplayName(wedding),
      response
    );
    createNotification({
      userId: wedding.userId,
      ...rsvpNotif,
      data: { link: `/weddings/${wedding.id}/guests`, weddingId: wedding.id, guestId: guest.id },
      io
    }).catch(err => logger.error('RSVP notification failed:', err));

    res.json({
      message: response === 'CONFIRMED' 
        ? 'Merci ! Votre présence est confirmée.' 
        : 'Merci pour votre réponse.',
      rsvp: {
        status: response,
        date: new Date()
      }
    });
  } catch (error) {
    logger.error('RSVP error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la réponse' });
  }
});

/**
 * @route   GET /i/:weddingSlug
 * @desc    Get wedding info without specific invitation
 * @access  Public
 */
router.get('/:weddingSlug', async (req, res) => {
  try {
    const { weddingSlug } = req.params;

    const wedding = await prisma.wedding.findUnique({
      where: { slug: weddingSlug },
      select: {
        eventType: true,
        eventTitle: true,
        brideName: true,
        groomName: true,
        weddingDate: true,
        ceremonyTime: true,
        venueName: true,
        venueAddress: true,
        venueCity: true,
        venueMapUrl: true,
        coverPhoto: true,
        logo: true,
        isPublished: true,
        status: true
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvé' });
    }

    res.json({
      wedding: {
        eventType: wedding.eventType,
        eventTitle: wedding.eventTitle,
        brideName: wedding.brideName,
        groomName: wedding.groomName,
        weddingDate: wedding.weddingDate,
        ceremonyTime: wedding.ceremonyTime,
        venueName: wedding.venueName,
        venueAddress: wedding.venueAddress,
        venueCity: wedding.venueCity,
        venueMapUrl: wedding.venueMapUrl,
        coverPhoto: wedding.coverPhoto,
        logo: wedding.logo
      }
    });
  } catch (error) {
    logger.error('Get wedding info error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /i/:weddingSlug/:invitationCode/pdf
 * @desc    Download invitation PDF
 * @access  Public
 */
router.get('/:weddingSlug/:invitationCode/pdf', async (req, res) => {
  try {
    const { weddingSlug, invitationCode } = req.params;

    const wedding = await prisma.wedding.findUnique({
      where: { slug: weddingSlug }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvé' });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { uniqueCode: invitationCode },
      include: {
        guest: true
      }
    });

    if (!invitation || invitation.weddingId !== wedding.id) {
      return res.status(404).json({ error: 'Invitation non trouvée' });
    }

    if (!invitation.pdfUrl) {
      return res.status(404).json({ error: 'PDF non disponible' });
    }

    res.redirect(invitation.pdfUrl);
  } catch (error) {
    logger.error('Download PDF error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
