const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const kpay = require('../utils/kpay');
const { approveInvitationOrder } = require('../utils/invitationOrders');
const { markPayoutPaid, markPayoutFailed } = require('../utils/payouts');

const prisma = new PrismaClient();

// externalId conventions used when we initiate K-PAY operations.
const ORDER_PREFIX = 'inv_';
const PAYOUT_PREFIX = 'payout_';

async function handlePaymentEvent(event, payload, io) {
  const externalId = payload.externalId || '';
  if (!externalId.startsWith(ORDER_PREFIX)) {
    logger.warn(`K-PAY payment webhook with unknown externalId: ${externalId}`);
    return;
  }
  const orderId = externalId.slice(ORDER_PREFIX.length);

  if (event === 'payment.completed') {
    await approveInvitationOrder(orderId, { processedBy: null, io });
    logger.info(`K-PAY: invitation order ${orderId} approved via payment ${payload.paymentId}`);
  } else if (event === 'payment.failed' || event === 'payment.cancelled') {
    // Keep the order PENDING so the client can retry; just record the reason.
    await prisma.invitationOrder.updateMany({
      where: { id: orderId, status: 'PENDING' },
      data: { adminNote: `K-PAY ${event}: ${payload.failureReason || 'n/a'}` }
    }).catch(() => {});
    logger.info(`K-PAY: payment ${event} for order ${orderId}`);
  }
}

async function handlePayoutEvent(event, payload, io) {
  const externalId = payload.externalId || '';
  if (!externalId.startsWith(PAYOUT_PREFIX)) {
    logger.warn(`K-PAY payout webhook with unknown externalId: ${externalId}`);
    return;
  }
  const payoutId = externalId.slice(PAYOUT_PREFIX.length);

  if (event === 'payout.completed') {
    await markPayoutPaid(payoutId, payload.paymentId || payload.reference);
  } else if (event === 'payout.failed' || event === 'payout.cancelled') {
    await markPayoutFailed(payoutId, event, payload.failureReason);
  }
}

// Single handler for all callback URLs (generic / deposits / payouts / refunds).
async function webhookHandler(req, res) {
  const signature = req.headers['x-kpay-signature'];
  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

  if (!kpay.verifyWebhookSignature(raw, signature)) {
    logger.warn('K-PAY webhook: invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Acknowledge fast, then process.
  res.status(200).json({ received: true });

  const payload = req.body || {};
  const event = payload.event || '';
  const io = req.app.get('io');

  try {
    if (event.startsWith('payment.')) {
      await handlePaymentEvent(event, payload, io);
    } else if (event.startsWith('payout.')) {
      await handlePayoutEvent(event, payload, io);
    } else if (event.startsWith('refund.')) {
      logger.info(`K-PAY refund event received: ${event}`);
    } else {
      logger.warn(`K-PAY webhook: unhandled event ${event}`);
    }
  } catch (err) {
    logger.error(`K-PAY webhook processing error (${event}):`, err);
  }
}

router.post('/kpay', webhookHandler);
router.post('/deposits', webhookHandler);
router.post('/payouts', webhookHandler);
router.post('/refunds', webhookHandler);

module.exports = router;
