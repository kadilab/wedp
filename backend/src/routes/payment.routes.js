const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { requestPaymentValidation, paginationValidation } = require('../middleware/validation.middleware');
const { uploadSingle, handleUploadError } = require('../middleware/upload.middleware');
const { sendPaymentApprovedEmail } = require('../utils/email');
const { paginate, buildPaginationMeta } = require('../utils/helpers');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * @route   POST /api/payments/request
 * @desc    Request payment activation
 * @access  Private
 */
router.post('/request', authenticate, requestPaymentValidation, async (req, res) => {
  try {
    const { weddingId, amount, couponCode, method, reference } = req.body;

    // Verify wedding ownership
    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        userId: req.user.id
      },
      include: {
        plan: true
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvé' });
    }

    if (wedding.status === 'ACTIVE') {
      return res.status(400).json({ error: 'Ce projet est déjà actif' });
    }

    // Check for pending payment
    const pendingPayment = await prisma.payment.findFirst({
      where: {
        weddingId,
        status: 'PENDING'
      }
    });

    if (pendingPayment) {
      return res.status(400).json({ error: 'Une demande de paiement est déjà en attente' });
    }

    let finalAmount = amount;
    let discountAmount = null;
    let couponId = null;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: couponCode.toUpperCase(),
          isActive: true,
          validFrom: { lte: new Date() },
          OR: [
            { validUntil: null },
            { validUntil: { gte: new Date() } }
          ]
        }
      });

      if (!coupon) {
        return res.status(400).json({ error: 'Code coupon invalide ou expiré' });
      }

      // Check max uses
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return res.status(400).json({ error: 'Ce coupon a atteint sa limite d\'utilisation' });
      }

      // Check if user already used this coupon
      const alreadyUsed = await prisma.couponUsage.findFirst({
        where: {
          couponId: coupon.id,
          userId: req.user.id
        }
      });

      if (alreadyUsed) {
        return res.status(400).json({ error: 'Vous avez déjà utilisé ce coupon' });
      }

      // Calculate discount
      if (coupon.discountType === 'percentage') {
        discountAmount = (amount * parseFloat(coupon.discountValue)) / 100;
      } else {
        discountAmount = parseFloat(coupon.discountValue);
      }

      finalAmount = Math.max(0, amount - discountAmount);
      couponId = coupon.id;
    }

    // Create payment request
    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        weddingId,
        amount: finalAmount,
        method,
        reference,
        status: 'PENDING',
        couponId,
        discountAmount
      },
      include: {
        wedding: {
          select: { brideName: true, groomName: true }
        }
      }
    });

    // Update wedding status
    await prisma.wedding.update({
      where: { id: weddingId },
      data: { status: 'PENDING_PAYMENT' }
    });

    // Log payment request
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'PAYMENT',
        entity: 'payment',
        entityId: payment.id,
        details: { amount: finalAmount, status: 'requested' }
      }
    });

    res.status(201).json({
      message: 'Demande de paiement soumise. En attente de validation.',
      payment
    });
  } catch (error) {
    logger.error('Request payment error:', error);
    res.status(500).json({ error: 'Erreur lors de la demande de paiement' });
  }
});

/**
 * @route   POST /api/payments/:id/proof
 * @desc    Upload payment proof
 * @access  Private
 */
router.post('/:id/proof', authenticate, uploadSingle('proof'), handleUploadError, async (req, res) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier uploadé' });
    }

    const proofPath = `/uploads/images/${req.file.filename}`;

    await prisma.payment.update({
      where: { id: req.params.id },
      data: { proofUrl: proofPath }
    });

    res.json({
      message: 'Preuve de paiement uploadée',
      proofUrl: proofPath
    });
  } catch (error) {
    logger.error('Upload proof error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

/**
 * @route   GET /api/payments
 * @desc    Get user's payments
 * @access  Private
 */
router.get('/', authenticate, paginationValidation, async (req, res) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);

    const where = (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') 
      ? {} 
      : { userId: req.user.id };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          wedding: {
            select: { id: true, brideName: true, groomName: true, eventType: true, eventTitle: true, slug: true }
          },
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          coupon: {
            select: { code: true, discountType: true, discountValue: true }
          }
        }
      }),
      prisma.payment.count({ where })
    ]);

    res.json({
      payments,
      pagination: buildPaginationMeta(total, page, limit)
    });
  } catch (error) {
    logger.error('Get payments error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/payments/:id/approve
 * @desc    Approve payment (Admin only)
 * @access  Private/Admin
 */
router.put('/:id/approve', authenticate, isAdmin, async (req, res) => {
  try {
    const { adminNote } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        wedding: true,
        coupon: true
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    if (payment.status !== 'PENDING') {
      return res.status(400).json({ error: 'Ce paiement a déjà été traité' });
    }

    // Update payment
    await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        processedAt: new Date(),
        processedBy: req.user.id,
        adminNote
      }
    });

    // Activate wedding
    await prisma.wedding.update({
      where: { id: payment.weddingId },
      data: {
        status: 'ACTIVE',
        isPublished: true,
        publishedAt: new Date()
      }
    });

    // Update coupon usage if used
    if (payment.couponId) {
      await prisma.coupon.update({
        where: { id: payment.couponId },
        data: { usedCount: { increment: 1 } }
      });

      await prisma.couponUsage.create({
        data: {
          couponId: payment.couponId,
          userId: payment.userId
        }
      });
    }

    // Log activation
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'ACTIVATION',
        entity: 'wedding',
        entityId: payment.weddingId,
        details: { paymentId: payment.id, activatedBy: req.user.id }
      }
    });

    // Send approval email
    sendPaymentApprovedEmail(payment.user, payment.wedding)
      .catch(err => logger.error('Approval email failed:', err));

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`wedding-${payment.weddingId}`).emit('payment-approved', {
        weddingId: payment.weddingId
      });
    }

    res.json({ message: 'Paiement approuvé et projet activé' });
  } catch (error) {
    logger.error('Approve payment error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'approbation' });
  }
});

/**
 * @route   PUT /api/payments/:id/reject
 * @desc    Reject payment (Admin only)
 * @access  Private/Admin
 */
router.put('/:id/reject', authenticate, isAdmin, async (req, res) => {
  try {
    const { adminNote } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    if (payment.status !== 'PENDING') {
      return res.status(400).json({ error: 'Ce paiement a déjà été traité' });
    }

    await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        processedAt: new Date(),
        processedBy: req.user.id,
        adminNote
      }
    });

    // Update wedding status back to draft
    await prisma.wedding.update({
      where: { id: payment.weddingId },
      data: { status: 'DRAFT' }
    });

    res.json({ message: 'Paiement rejeté' });
  } catch (error) {
    logger.error('Reject payment error:', error);
    res.status(500).json({ error: 'Erreur lors du rejet' });
  }
});

module.exports = router;
