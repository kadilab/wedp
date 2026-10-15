const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadSingle, handleUploadError } = require('../middleware/upload.middleware');
const { getWeddingQuota } = require('../utils/invitationQuota');
const { sendTelegramNotification } = require('../utils/telegram');
const { notifyAdmins, NotificationTemplates } = require('../utils/notifications');
const kpay = require('../utils/kpay');
const { buildOrderExternalId, confirmOrderPayment } = require('../utils/kpayOrders');
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

    // Lets the payment modal show the total in FC or USD. Mobile Money is
    // charged in the operator currency (CDF), cards in USD.
    const cfg = await kpay.getKpayConfig();
    const fx = require('../utils/fx');
    const usdRate = cfg.priceCurrency === 'USD' ? 1 : await fx.getUsdRate(cfg.priceCurrency);

    res.json({
      unitPrice,
      templateName,
      currency: cfg.priceCurrency,
      usdRate, // units of `currency` per 1 USD
      cardMinUsd: kpay.CARD_MIN_USD,
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
    // Staff accounts generate without quota (see invitation.routes.js) — say
    // so, otherwise the UI shows a confusing "1 générée / 0 achetée".
    const unlimited = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    res.json({ quota: { ...quota, unlimited } });
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

    // Anti-duplicate: reuse the client's own unpaid order for the same event,
    // quantity, coupon and amount (double click, modal reopened, second tab…)
    // instead of piling up identical PENDING orders.
    const existing = await prisma.invitationOrder.findFirst({
      where: {
        userId: req.user.id,
        weddingId: wedding.id,
        status: 'PENDING',
        submittedAt: null,
        quantity: qty,
        couponId,
        totalAmount,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (existing) {
      return res.status(200).json({ message: 'Commande en attente réutilisée', order: existing, reused: true });
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
 * @desc    Initiate an automatic K-PAY payment for a pending order.
 *          { method: 'MOBILE_MONEY', provider, phoneNumber } → USSD push, charged
 *            in the operator currency (CDF / FC).
 *          { method: 'CARD' } → hosted Visa/Mastercard page, charged in USD;
 *            returns a gatewayUrl to redirect the client to.
 *          The same order can be retried (another operator, card…): every
 *          attempt gets its own externalId.
 * @access  Private (owner)
 */
router.post('/:weddingId/orders/:orderId/kpay', authenticate, async (req, res) => {
  const { provider, phoneNumber } = req.body || {};
  const method = String(req.body?.method || (provider ? 'MOBILE_MONEY' : 'CARD')).toUpperCase();
  try {
    if (!(await kpay.isConfigured())) {
      return res.status(503).json({ error: 'Le paiement en ligne est momentanément indisponible.' });
    }
    const cfg = await kpay.getKpayConfig();

    const wedding = await findOwnedWedding(req.params.weddingId, req.user);
    if (!wedding) return res.status(404).json({ error: 'Mariage non trouvé' });

    const order = await prisma.invitationOrder.findFirst({
      where: { id: req.params.orderId, weddingId: wedding.id }
    });
    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cette commande a déjà été traitée' });
    }

    const customerName = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || undefined;
    const payload = {
      externalId: buildOrderExternalId(order.id),
      description: `Invitations Winvite (${order.quantity})`,
      customerEmail: req.user.email || undefined,
      metadata: { orderId: order.id, weddingId: wedding.id }
    };
    let currency;

    if (method === 'CARD') {
      if (!cfg.cardEnabled) {
        return res.status(400).json({ error: 'Le paiement par carte n\'est pas encore disponible.' });
      }
      // Cards: always the hosted page, always USD (min 1 USD).
      payload.amount = await kpay.toUsdAmount(parseFloat(order.totalAmount));
      payload.paymentMethod = 'CARD';
      const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
      payload.returnUrl = `${frontendUrl}/paiement/retour`;
      payload.cancelUrl = `${frontendUrl}/paiement/retour?annule=1`;
      currency = 'USD';
    } else {
      const known = kpay.MOMO_PROVIDERS.some(p => p.provider === provider);
      if (!known) return res.status(400).json({ error: 'Choisissez votre opérateur Mobile Money' });

      // Refuse an operator we already know is down/not configured — saves the
      // client a useless USSD wait.
      const availability = await kpay.getPaymentAvailability();
      const op = availability.mobileMoney.find(m => m.provider === provider);
      if (op?.status === 'UNAVAILABLE') {
        return res.status(409).json({
          code: 'PROVIDER_UNAVAILABLE',
          provider,
          error: 'Ce moyen de paiement n\'est pas disponible pour le moment. Choisissez un autre opérateur.'
        });
      }

      // DIRECT (USSD) mode — currency follows the operator (RDC → CDF). The
      // phone must be international: 243 + 9 digits.
      const phone = kpay.normalizeMomoPhone(phoneNumber, provider);
      if (!/^243\d{9}$/.test(phone)) {
        return res.status(400).json({ error: 'Numéro RDC invalide (format 243XXXXXXXXX)' });
      }
      payload.amount = await kpay.toAccountAmount(parseFloat(order.totalAmount));
      payload.provider = provider;
      payload.phoneNumber = phone;
      payload.customerName = customerName;
      currency = cfg.accountCurrency;
    }

    if (!payload.amount || payload.amount <= 0) {
      return res.status(400).json({ error: 'Montant de la commande invalide' });
    }

    logger.info(`K-PAY init [${cfg.mode}]: order ${order.id}, ${payload.amount} ${currency}, ${method === 'CARD' ? 'CARD' : 'USSD/' + provider}`);
    const result = await kpay.initPayment(payload);

    // Remember the K-PAY payment on the order (latest attempt wins). Touching
    // the row also restarts the 30-min expiry window.
    await prisma.invitationOrder.update({
      where: { id: order.id },
      data: {
        paymentProvider: method === 'CARD' ? 'KPAY_CARD' : 'KPAY',
        transactionId: result.id || result.reference,
        payerPhone: payload.phoneNumber || order.payerPhone
      }
    });

    res.status(201).json({
      message: 'Paiement initié',
      paymentId: result.id,
      reference: result.reference,
      status: result.status,
      amount: payload.amount,
      currency,
      gatewayUrl: result.gatewayUrl || null
    });
  } catch (error) {
    // Full error server-side (never the keys) so it can be forwarded to KPay support.
    logger.error(`K-PAY init payment error (${method}/${provider || '-'}):`, JSON.stringify(error.data) || error.message);

    if (method !== 'CARD' && provider && kpay.isProviderNotConfiguredError(error)) {
      await kpay.blockProvider(provider, kpay.extractApiError(error)).catch(() => {});
      return res.status(409).json({
        code: 'PROVIDER_UNAVAILABLE',
        provider,
        error: 'Ce moyen de paiement n\'est pas disponible pour le moment. Choisissez un autre opérateur.'
      });
    }
    if (error.status === 422) {
      return res.status(422).json({ error: 'Le montant est hors des limites acceptées pour ce moyen de paiement.' });
    }
    if (error.status === 429 || error.status >= 500 || !error.status) {
      return res.status(502).json({ error: 'Le service de paiement ne répond pas. Réessayez dans un instant.' });
    }
    res.status(502).json({ error: kpay.extractApiError(error) });
  }
});

/**
 * @route   GET /api/invitation-orders/:weddingId/orders/:orderId/kpay/status
 * @desc    Live payment status for the payment modal. Asks K-PAY (GET
 *          /payments/:id) and approves the order right away when COMPLETED —
 *          idempotent, the webhook remains the authoritative second path.
 * @access  Private (owner)
 */
router.get('/:weddingId/orders/:orderId/kpay/status', authenticate, async (req, res) => {
  try {
    const wedding = await findOwnedWedding(req.params.weddingId, req.user);
    if (!wedding) return res.status(404).json({ error: 'Mariage non trouvé' });

    const order = await prisma.invitationOrder.findFirst({
      where: { id: req.params.orderId, weddingId: wedding.id }
    });
    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });

    // Already settled — nothing to poll.
    if (order.status === 'APPROVED') {
      return res.json({ paymentStatus: 'COMPLETED', orderStatus: 'APPROVED' });
    }
    if (!order.transactionId) {
      return res.json({ paymentStatus: 'UNKNOWN', orderStatus: order.status });
    }

    const payment = await kpay.getPayment(order.transactionId);
    const paymentStatus = String(payment?.status || payment?.data?.status || 'UNKNOWN').toUpperCase();
    const failureReason = payment?.failureReason || payment?.data?.failureReason || null;

    const outcome = await confirmOrderPayment(order, payment, req.app.get('io'));
    if (outcome === 'APPROVED') return res.json({ paymentStatus: 'COMPLETED', orderStatus: 'APPROVED' });
    if (outcome === 'UNDERPAID') {
      return res.status(409).json({ paymentStatus: 'UNDERPAID', orderStatus: order.status, error: 'Montant payé insuffisant' });
    }

    res.json({ paymentStatus, orderStatus: order.status, failureReason });
  } catch (error) {
    logger.error('K-PAY status check error:', JSON.stringify(error.data) || error.message);
    res.status(502).json({ error: kpay.extractApiError(error) });
  }
});

/**
 * @route   POST /api/invitation-orders/:weddingId/orders/:orderId/proof
 * @desc    Upload a screenshot of the manual transfer (optional, helps the
 *          admin validate). Stored on the order right away.
 * @access  Private (owner)
 */
router.post('/:weddingId/orders/:orderId/proof', authenticate, uploadSingle('proof'), handleUploadError, async (req, res) => {
  try {
    const wedding = await findOwnedWedding(req.params.weddingId, req.user);
    if (!wedding) return res.status(404).json({ error: 'Mariage non trouvé' });
    const order = await prisma.invitationOrder.findFirst({ where: { id: req.params.orderId, weddingId: wedding.id } });
    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });
    if (order.status !== 'PENDING') return res.status(400).json({ error: 'Cette commande a déjà été traitée' });
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier envoyé' });

    const proofUrl = `/uploads/images/${req.file.filename}`;
    await prisma.invitationOrder.update({ where: { id: order.id }, data: { proofUrl } });
    res.json({ proofUrl });
  } catch (error) {
    logger.error('Upload invitation order proof error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi de la preuve' });
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
        proofUrl: proofUrl || order.proofUrl || null,
        submittedAt: new Date()
      }
    });

    const weddingLabel = eventDisplayName(wedding);

    sendTelegramNotification(
      `🔔 <b>Nouvelle commande d'invitations</b>\n` +
      `👤 ${req.user.firstName} ${req.user.lastName} (${req.user.email})\n` +
      `💍 ${weddingLabel}\n` +
      `🔢 ${updated.quantity} invitation(s) — ${updated.totalAmount} FC\n` +
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
