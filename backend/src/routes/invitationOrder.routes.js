const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { getWeddingQuota } = require('../utils/invitationQuota');
const { sendTelegramNotification } = require('../utils/telegram');
const { notifyAdmins, NotificationTemplates } = require('../utils/notifications');
const kpay = require('../utils/kpay');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

async function getSettingValue(key) {
  const setting = await prisma.setting.findUnique({ where: { key } });
  if (!setting) return null;
  if (setting.type === 'json') {
    try { return JSON.parse(setting.value); } catch { return null; }
  }
  return setting.value;
}

function eventDisplayName(wedding) {
  if (!wedding.eventType || wedding.eventType === 'WEDDING') {
    return `${wedding.brideName} & ${wedding.groomName}`;
  }
  return wedding.eventTitle || 'Événement';
}

async function findOwnedWedding(weddingId, user) {
  return prisma.wedding.findFirst({
    where: {
      id: weddingId,
      ...(user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && { userId: user.id })
    }
  });
}

/**
 * @route   GET /api/invitation-orders/pricing
 * @desc    Get unit price + payment methods for buying invitation quota
 * @access  Private
 */
router.get('/pricing', authenticate, async (req, res) => {
  try {
    const paymentMethods = await getSettingValue('invitationPaymentMethods');

    // Unit price is per-design: resolved from the wedding's chosen template.
    let unitPrice = 0;
    let templateName = null;
    const { weddingId } = req.query;
    if (weddingId) {
      const wedding = await findOwnedWedding(weddingId, req.user);
      if (wedding?.templateId) {
        const tpl = await prisma.template.findUnique({
          where: { id: wedding.templateId },
          select: { pricePerInvitation: true, name: true }
        });
        unitPrice = parseFloat(tpl?.pricePerInvitation) || 0;
        templateName = tpl?.name || null;
      }
    }

    res.json({
      unitPrice,
      templateName,
      currency: 'USD',
      paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : []
    });
  } catch (error) {
    logger.error('Get invitation pricing error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/invitation-orders/mine
 * @desc    List all invitation orders for the current user across all their weddings
 * @access  Private
 * @note    Must be declared before /:weddingId/... routes, otherwise Express would
 *          match "mine" as a weddingId param.
 */
router.get('/mine', authenticate, async (req, res) => {
  try {
    const orders = await prisma.invitationOrder.findMany({
      where: { userId: req.user.id },
      include: {
        wedding: { select: { id: true, brideName: true, groomName: true, eventType: true, eventTitle: true, slug: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ orders });
  } catch (error) {
    logger.error('Get my invitation orders error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/invitation-orders/:weddingId/quota
 * @desc    Get remaining invitation quota for a wedding
 * @access  Private
 */
router.get('/:weddingId/quota', authenticate, async (req, res) => {
  try {
    const wedding = await findOwnedWedding(req.params.weddingId, req.user);
    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvé' });
    }

    const quota = await getWeddingQuota(wedding.id);
    res.json({ quota });
  } catch (error) {
    logger.error('Get invitation quota error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/invitation-orders/:weddingId/orders
 * @desc    List invitation orders (history) for a wedding
 * @access  Private
 */
router.get('/:weddingId/orders', authenticate, async (req, res) => {
  try {
    const wedding = await findOwnedWedding(req.params.weddingId, req.user);
    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvé' });
    }

    const orders = await prisma.invitationOrder.findMany({
      where: { weddingId: wedding.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ orders });
  } catch (error) {
    logger.error('Get invitation orders error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/invitation-orders/:weddingId
 * @desc    Create a new invitation quota order (quantity), price snapshot at order time
 * @access  Private
 */
router.post('/:weddingId', authenticate, async (req, res) => {
  try {
    const { quantity, couponCode } = req.body;
    const qty = parseInt(quantity, 10);

    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ error: 'Quantité invalide' });
    }

    const wedding = await findOwnedWedding(req.params.weddingId, req.user);
    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvé' });
    }

    // Price per invitation now comes from the chosen design (template), not a
    // global setting.
    let unitPrice = 0;
    if (wedding.templateId) {
      const tpl = await prisma.template.findUnique({
        where: { id: wedding.templateId },
        select: { pricePerInvitation: true }
      });
      unitPrice = parseFloat(tpl?.pricePerInvitation) || 0;
    }
    let totalAmount = Math.round(qty * unitPrice * 100) / 100;

    let couponId = null;
    let discountAmount = null;

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

      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return res.status(400).json({ error: 'Ce coupon a atteint sa limite d\'utilisation' });
      }

      if (coupon.minPurchase && totalAmount < parseFloat(coupon.minPurchase)) {
        return res.status(400).json({ error: `Montant minimum requis pour ce coupon : ${coupon.minPurchase}$` });
      }

      const alreadyUsed = await prisma.couponUsage.findFirst({
        where: { couponId: coupon.id, userId: req.user.id }
      });

      if (alreadyUsed) {
        return res.status(400).json({ error: 'Vous avez déjà utilisé ce coupon' });
      }

      discountAmount = coupon.discountType === 'percentage'
        ? Math.round(totalAmount * parseFloat(coupon.discountValue)) / 100
        : parseFloat(coupon.discountValue);
      discountAmount = Math.min(discountAmount, totalAmount);
      totalAmount = Math.round((totalAmount - discountAmount) * 100) / 100;
      couponId = coupon.id;
    }

    const order = await prisma.invitationOrder.create({
      data: {
        userId: req.user.id,
        weddingId: wedding.id,
        quantity: qty,
        unitPrice,
        totalAmount,
        couponId,
        discountAmount,
        status: 'PENDING'
      }
    });

    res.status(201).json({
      message: 'Commande créée. Envoyez le paiement puis soumettez votre numéro de transaction.',
      order
    });
  } catch (error) {
    logger.error('Create invitation order error:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la commande' });
  }
});

/**
 * @route   POST /api/invitation-orders/:weddingId/orders/:orderId/kpay
 * @desc    Initiate automatic Mobile Money payment (K-PAY) for a pending order.
 *          GATEWAY mode by default (returns a gatewayUrl to redirect the client);
 *          pass { provider, phoneNumber } for direct USSD mode.
 * @access  Private (owner)
 */
router.post('/:weddingId/orders/:orderId/kpay', authenticate, async (req, res) => {
  try {
    if (!kpay.isConfigured()) {
      return res.status(503).json({ error: 'Paiement automatique non configuré' });
    }

    const wedding = await findOwnedWedding(req.params.weddingId, req.user);
    if (!wedding) return res.status(404).json({ error: 'Mariage non trouvé' });

    const order = await prisma.invitationOrder.findFirst({
      where: { id: req.params.orderId, weddingId: wedding.id }
    });
    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cette commande a déjà été traitée' });
    }

    const amount = Math.round(parseFloat(order.totalAmount));
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Montant de la commande invalide' });
    }

    const { provider, phoneNumber } = req.body || {};
    const frontendUrl = process.env.FRONTEND_URL || '';
    const payload = {
      amount,
      externalId: `inv_${order.id}`,
      description: `Invitations (${order.quantity}) — ${wedding.slug}`,
      metadata: { orderId: order.id, weddingId: wedding.id }
    };

    if (provider && phoneNumber) {
      // USSD (direct) mode
      payload.provider = provider;
      payload.phoneNumber = phoneNumber;
    } else {
      // GATEWAY (hosted) mode
      payload.returnUrl = `${frontendUrl}/weddings/${wedding.id}/invitations?kpay=return&order=${order.id}`;
      payload.cancelUrl = `${frontendUrl}/weddings/${wedding.id}/invitations?kpay=cancel&order=${order.id}`;
    }

    const result = await kpay.initPayment(payload);

    // Remember the K-PAY payment reference on the order.
    await prisma.invitationOrder.update({
      where: { id: order.id },
      data: { paymentProvider: 'KPAY', transactionId: result.id || result.reference }
    });

    res.status(201).json({
      message: 'Paiement initié',
      paymentId: result.id,
      reference: result.reference,
      status: result.status,
      gatewayUrl: result.gatewayUrl || null
    });
  } catch (error) {
    const apiErr = error.response?.data;
    logger.error('K-PAY init payment error:', apiErr || error.message);
    res.status(502).json({ error: apiErr?.message || 'Erreur lors de l\'initiation du paiement' });
  }
});

/**
 * @route   PUT /api/invitation-orders/:weddingId/orders/:orderId/submit
 * @desc    Submit the mobile-money transaction id for a pending order
 * @access  Private
 */
router.put('/:weddingId/orders/:orderId/submit', authenticate, async (req, res) => {
  try {
    const { transactionId, paymentProvider, payerPhone, proofUrl } = req.body;

    if (!transactionId || !transactionId.trim()) {
      return res.status(400).json({ error: 'Le numéro de transaction est requis' });
    }

    const wedding = await findOwnedWedding(req.params.weddingId, req.user);
    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvé' });
    }

    const order = await prisma.invitationOrder.findFirst({
      where: { id: req.params.orderId, weddingId: wedding.id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cette commande a déjà été traitée' });
    }

    const updated = await prisma.invitationOrder.update({
      where: { id: order.id },
      data: {
        transactionId: transactionId.trim(),
        paymentProvider: paymentProvider || null,
        payerPhone: payerPhone || null,
        proofUrl: proofUrl || null,
        submittedAt: new Date()
      }
    });

    const weddingLabel = eventDisplayName(wedding);

    sendTelegramNotification(
      `🔔 <b>Nouvelle commande d'invitations</b>\n` +
      `👤 ${req.user.firstName} ${req.user.lastName} (${req.user.email})\n` +
      `💍 ${weddingLabel}\n` +
      `🔢 ${updated.quantity} invitation(s) — ${updated.totalAmount}$\n` +
      `📱 ${updated.paymentProvider || '-'} — Réf: ${updated.transactionId}`
    );

    const orderNotif = NotificationTemplates.newInvitationOrderSubmitted(updated.quantity, weddingLabel);
    notifyAdmins({
      ...orderNotif,
      data: { link: '/admin/invitation-orders', orderId: order.id },
      io: req.app.get('io')
    }).catch(err => logger.error('Notify admins (invitation order) failed:', err));

    res.json({
      message: 'Numéro de transaction soumis. En attente de validation.',
      order: updated
    });
  } catch (error) {
    logger.error('Submit invitation order transaction error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
