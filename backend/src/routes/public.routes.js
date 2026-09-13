const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { createNotification, NotificationTemplates } = require('../utils/notifications');
const { eventDisplayName } = require('../utils/helpers');
const { uploadSingle, handleUploadError } = require('../middleware/upload.middleware');
const kpay = require('../utils/kpay');

const prisma = new PrismaClient();

// NOTE: these routes use a static first segment ('guestbook', 'gift') and MUST
// stay registered before the generic '/:weddingSlug' and
// '/:weddingSlug/:invitationCode' routes below — otherwise Express would match
// that segment as a weddingSlug.

/**
 * @route   GET /api/public/gift/:weddingSlug
 * @desc    Gift registry (cagnotte) info for the invitation page: whether it's
 *          enabled, the goal/message, and how much has been raised so far.
 *          Also requires K-PAY to actually be configured — a wedding could
 *          have the toggle on from before the admin ever set up K-PAY.
 * @access  Public
 */
router.get('/gift/:weddingSlug', async (req, res) => {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { slug: req.params.weddingSlug },
      select: { id: true, giftRegistryEnabled: true, giftRegistryGoal: true, giftRegistryMessage: true }
    });
    if (!wedding || !wedding.giftRegistryEnabled || !(await kpay.isConfigured())) {
      return res.json({ enabled: false });
    }

    const [approved, count] = await Promise.all([
      prisma.giftContribution.aggregate({
        where: { weddingId: wedding.id, status: 'APPROVED' },
        _sum: { amount: true }
      }),
      prisma.giftContribution.count({ where: { weddingId: wedding.id, status: 'APPROVED' } })
    ]);

    res.json({
      enabled: true,
      goal: wedding.giftRegistryGoal,
      message: wedding.giftRegistryMessage,
      totalRaised: approved._sum.amount || 0,
      contributorsCount: count
    });
  } catch (error) {
    logger.error('Get gift registry info error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/public/gift/:weddingSlug/init
 * @desc    Initiate a Mobile Money (K-PAY DIRECT/USSD) payment for a cash gift.
 * @access  Public
 */
router.post('/gift/:weddingSlug/init', async (req, res) => {
  try {
    if (!(await kpay.isConfigured())) {
      return res.status(503).json({ error: 'Paiement non configuré' });
    }

    const wedding = await prisma.wedding.findUnique({ where: { slug: req.params.weddingSlug } });
    if (!wedding || !wedding.giftRegistryEnabled) {
      return res.status(404).json({ error: 'Cagnotte non disponible' });
    }

    const { donorName, amount, message, provider, phoneNumber } = req.body || {};
    const name = String(donorName || '').trim();
    const value = parseFloat(amount);
    if (!name) return res.status(400).json({ error: 'Votre nom est requis' });
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'Montant invalide' });
    if (!provider || !phoneNumber) return res.status(400).json({ error: 'Opérateur et numéro requis' });

    const phone = kpay.normalizeMomoPhone(phoneNumber, provider);
    if (!/^243\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'Numéro RDC invalide (format 243XXXXXXXXX)' });
    }

    const contribution = await prisma.giftContribution.create({
      data: {
        weddingId: wedding.id,
        donorName: name,
        amount: value,
        message: (message || '').trim() || null,
        paymentProvider: provider,
        payerPhone: phone,
        status: 'PENDING'
      }
    });

    // K-PAY charges in the operator/account currency — convert our stored
    // (site-currency) amount the same way invitation orders do.
    const kpayAmount = await kpay.toAccountAmount(value);
    try {
      const result = await kpay.initPayment({
        amount: kpayAmount,
        provider,
        phoneNumber: phone,
        externalId: `gift_${contribution.id}`,
        description: `Cadeau — ${eventDisplayName(wedding)}`,
        metadata: { contributionId: contribution.id, weddingId: wedding.id }
      });
      await prisma.giftContribution.update({
        where: { id: contribution.id },
        data: { transactionId: result.id || result.reference }
      });
      res.status(201).json({ message: 'Paiement initié', contributionId: contribution.id });
    } catch (err) {
      logger.error('K-PAY gift init error:', JSON.stringify(err.data) || err.message);
      res.status(502).json({ error: kpay.extractApiError(err) });
    }
  } catch (error) {
    logger.error('Init gift payment error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'initialisation du paiement' });
  }
});

/**
 * @route   GET /api/public/gift/status/:contributionId
 * @desc    Poll the live K-PAY status for a gift payment; approves it the
 *          moment K-PAY confirms completion (webhook is the other, faster
 *          path — this is the guaranteed fallback the frontend polls).
 * @access  Public
 */
router.get('/gift/status/:contributionId', async (req, res) => {
  try {
    const contribution = await prisma.giftContribution.findUnique({ where: { id: req.params.contributionId } });
    if (!contribution) return res.status(404).json({ error: 'Contribution non trouvée' });

    if (contribution.status === 'APPROVED') {
      return res.json({ paymentStatus: 'COMPLETED', status: 'APPROVED' });
    }
    if (!contribution.transactionId) {
      return res.json({ paymentStatus: 'UNKNOWN', status: contribution.status });
    }

    const payment = await kpay.getPayment(contribution.transactionId);
    const paymentStatus = String(payment?.status || payment?.data?.status || 'UNKNOWN').toUpperCase();

    if (paymentStatus === 'COMPLETED' || paymentStatus === 'SUCCESS') {
      const paid = Number(payment?.amount ?? payment?.data?.amount ?? NaN);
      const due = await kpay.toAccountAmount(parseFloat(contribution.amount));
      const tolerance = Math.max(1, due * 0.01);
      if (Number.isFinite(paid) && paid + tolerance < due) {
        logger.warn(`K-PAY gift underpayment: contribution ${contribution.id} due ${due}, paid ${paid} — not approving`);
        return res.status(409).json({ paymentStatus: 'UNDERPAID', status: contribution.status, error: 'Montant payé insuffisant' });
      }
      const updated = await prisma.giftContribution.updateMany({
        where: { id: contribution.id, status: { not: 'APPROVED' } },
        data: { status: 'APPROVED', paidAt: new Date() }
      });
      if (updated.count > 0) {
        const wedding = await prisma.wedding.findUnique({ where: { id: contribution.weddingId } });
        const notif = NotificationTemplates.giftReceived(
          contribution.donorName, contribution.amount, contribution.currency, eventDisplayName(wedding)
        );
        createNotification({
          userId: wedding.userId,
          ...notif,
          data: { link: `/weddings/${wedding.id}/gifts`, weddingId: wedding.id },
          io: req.app.get('io')
        }).catch((err) => logger.error('Gift notification failed:', err));
      }
      return res.json({ paymentStatus: 'COMPLETED', status: 'APPROVED' });
    }

    res.json({ paymentStatus, status: contribution.status });
  } catch (error) {
    logger.error('K-PAY gift status check error:', JSON.stringify(error.data) || error.message);
    res.status(502).json({ error: kpay.extractApiError(error) });
  }
});

/**
 * @route   GET /api/public/guestbook/:weddingSlug
 * @desc    Get the approved guestbook wall for a wedding (+ id, to join the socket room)
 * @access  Public
 */
router.get('/guestbook/:weddingSlug', async (req, res) => {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { slug: req.params.weddingSlug },
      select: { id: true, guestbookEnabled: true, brideName: true, groomName: true, eventTitle: true, eventType: true }
    });

    if (!wedding || !wedding.guestbookEnabled) {
      return res.status(404).json({ error: 'Livre d\'or non disponible' });
    }

    const posts = await prisma.guestbookPost.findMany({
      where: { weddingId: wedding.id, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({
      wedding: { id: wedding.id, title: eventDisplayName(wedding) },
      posts
    });
  } catch (error) {
    logger.error('Get guestbook wall error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/public/guestbook/:weddingSlug
 * @desc    Submit a guestbook post (message and/or photo)
 * @access  Public
 */
router.post('/guestbook/:weddingSlug', uploadSingle('guestbookPhoto'), handleUploadError, async (req, res) => {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { slug: req.params.weddingSlug }
    });

    if (!wedding || !wedding.guestbookEnabled) {
      return res.status(404).json({ error: 'Livre d\'or non disponible' });
    }

    const authorName = (req.body.authorName || '').trim();
    const message = (req.body.message || '').trim();
    const photoUrl = req.file ? `/uploads/guestbook/${req.file.filename}` : null;

    if (!authorName) {
      return res.status(400).json({ error: 'Votre nom est requis' });
    }
    if (!message && !photoUrl) {
      return res.status(400).json({ error: 'Ajoutez un message ou une photo' });
    }

    const post = await prisma.guestbookPost.create({
      data: {
        weddingId: wedding.id,
        authorName,
        message: message || null,
        photoUrl,
        status: wedding.guestbookAutoApprove ? 'APPROVED' : 'PENDING'
      }
    });

    const io = req.app.get('io');
    if (post.status === 'APPROVED') {
      if (io) {
        io.to(`wedding-${wedding.id}`).emit('guestbook-post', { weddingId: wedding.id, post });
      }
    } else {
      const notif = NotificationTemplates.guestbookPostPending(eventDisplayName(wedding));
      createNotification({
        userId: wedding.userId,
        ...notif,
        data: { link: `/weddings/${wedding.id}/guestbook`, weddingId: wedding.id },
        io
      }).catch(err => logger.error('Guestbook notification failed:', err));
    }

    res.json({
      message: post.status === 'APPROVED' ? 'Merci pour votre publication !' : 'Merci ! Votre publication sera visible après validation.',
      post
    });
  } catch (error) {
    logger.error('Submit guestbook post error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi' });
  }
});

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
        qrCodeBgColor: wedding.qrCodeBgColor,
        drinkOptions: wedding.drinkOptions
      },
      guest: {
        firstName: invitation.guest.firstName,
        lastName: invitation.guest.lastName,
        fullName: `${invitation.guest.firstName} ${invitation.guest.lastName}`,
        tableNumber: invitation.guest.tableNumber,
        plusOnes: invitation.guest.plusOnes,
        rsvpStatus: invitation.guest.rsvpStatus,
        drinkChoice: invitation.guest.drinkChoice
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
    const { response, message, plusOnes, drinkChoice } = req.body;

    if (!['CONFIRMED', 'DECLINED'].includes(response)) {
      return res.status(400).json({ error: 'Réponse invalide' });
    }

    const wedding = await prisma.wedding.findUnique({
      where: { slug: weddingSlug }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvé' });
    }

    // Drink choice must match one of the options the organizer configured
    // (or be omitted/cleared) — guards against arbitrary free text ending up
    // in the caterer's count.
    const drinkOptions = Array.isArray(wedding.drinkOptions) ? wedding.drinkOptions : [];
    if (drinkChoice && !drinkOptions.includes(drinkChoice)) {
      return res.status(400).json({ error: 'Boisson invalide' });
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
        ...(plusOnes !== undefined && { plusOnes }),
        ...(drinkChoice !== undefined && { drinkChoice: drinkChoice || null })
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
        musicUrl: true,
        drinkOptions: true,
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
        logo: wedding.logo,
        musicUrl: wedding.musicUrl,
        drinkOptions: wedding.drinkOptions
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
