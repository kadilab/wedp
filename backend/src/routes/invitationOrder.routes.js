const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { getWeddingQuota } = require('../utils/invitationQuota');
const { sendTelegramNotification } = require('../utils/telegram');
const { notifyAdmins, NotificationTemplates } = require('../utils/notifications');
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
    const [unitPriceRaw, paymentMethods] = await Promise.all([
      getSettingValue('invitationUnitPrice'),
      getSettingValue('invitationPaymentMethods')
    ]);

    res.json({
      unitPrice: parseFloat(unitPriceRaw) || 0,
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
    const { quantity } = req.body;
    const qty = parseInt(quantity, 10);

    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ error: 'Quantité invalide' });
    }

    const wedding = await findOwnedWedding(req.params.weddingId, req.user);
    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvé' });
    }

    const unitPriceRaw = await getSettingValue('invitationUnitPrice');
    const unitPrice = parseFloat(unitPriceRaw) || 0;
    const totalAmount = Math.round(qty * unitPrice * 100) / 100;

    const order = await prisma.invitationOrder.create({
      data: {
        userId: req.user.id,
        weddingId: wedding.id,
        quantity: qty,
        unitPrice,
        totalAmount,
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

    const weddingLabel = `${wedding.brideName} & ${wedding.groomName}`;

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
