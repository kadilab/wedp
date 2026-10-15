// Invitation-order ↔ K-PAY glue shared by the polling endpoint, the webhooks
// and the hosted-page return, so the "is this order really paid?" rule lives in
// exactly one place.
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');
const kpay = require('./kpay');
const { approveInvitationOrder } = require('./invitationOrders');

const prisma = new PrismaClient();

const ORDER_PREFIX = 'inv_';
// Unpaid K-PAY orders are expired after this delay (client closed the tab,
// never validated the USSD push…).
const ORDER_EXPIRY_MS = 30 * 60 * 1000;
// Orders with no payment attempt at all are expired after 24 h.
const MANUAL_EXPIRY_MS = 24 * 60 * 60 * 1000;

// K-PAY rejects a reused externalId (409), but a client may retry the same
// order (other operator, card after Mobile Money…). Each attempt gets its own
// suffix: inv_<orderId>.<attempt>. UUIDs never contain a dot.
function buildOrderExternalId(orderId) {
  return `${ORDER_PREFIX}${orderId}.${Date.now().toString(36)}`;
}

function orderIdFromExternalId(externalId) {
  const ext = String(externalId || '');
  if (!ext.startsWith(ORDER_PREFIX)) return null;
  return ext.slice(ORDER_PREFIX.length).split('.')[0] || null;
}

// What we asked K-PAY to collect for this order, in the currency it was
// charged in (USD for cards, operator currency — CDF — for Mobile Money).
async function amountDue(order, currency) {
  const total = parseFloat(order.totalAmount);
  const isUsd = currency ? String(currency).toUpperCase() === 'USD' : order.paymentProvider === 'KPAY_CARD';
  return isUsd ? kpay.toUsdAmount(total) : kpay.toAccountAmount(total);
}

/**
 * Approve `order` if `payment` (a K-PAY payment object or webhook payload) is
 * COMPLETED and covers the amount due. Idempotent.
 * @returns {Promise<'APPROVED'|'UNDERPAID'|'NOT_COMPLETED'>}
 */
async function confirmOrderPayment(order, payment, io) {
  const status = String(payment?.status || payment?.data?.status || '').toUpperCase();
  if (status !== 'COMPLETED' && status !== 'SUCCESS') return 'NOT_COMPLETED';

  // Anti-fraud: never approve unless the amount paid covers what we asked for
  // (avoids "pay a tiny amount, unlock everything").
  const paid = Number(payment?.amount ?? payment?.data?.amount ?? NaN);
  const currency = payment?.currency || payment?.data?.currency;
  const due = await amountDue(order, currency);
  const tolerance = Math.max(String(currency).toUpperCase() === 'USD' ? 0.01 : 1, due * 0.01);
  if (Number.isFinite(paid) && paid + tolerance < due) {
    logger.warn(`K-PAY underpayment: order ${order.id} due ${due}, paid ${paid} ${currency || ''} — not approving`);
    return 'UNDERPAID';
  }

  const { alreadyApproved } = await approveInvitationOrder(order.id, { processedBy: null, io });
  if (!alreadyApproved) logger.info(`K-PAY: invitation order ${order.id} approved (payment ${payment.paymentId || payment.id || '?'})`);
  return 'APPROVED';
}

// Expire K-PAY orders left unpaid for 30 min. A late `payment.completed`
// webhook still approves them (approveInvitationOrder accepts any non-approved
// order) — the client's money is never lost.
async function expireStaleKpayOrders() {
  const cutoff = new Date(Date.now() - ORDER_EXPIRY_MS);
  const { count } = await prisma.invitationOrder.updateMany({
    where: {
      status: 'PENDING',
      submittedAt: null, // a manual proof sent afterwards keeps it for review
      paymentProvider: { in: ['KPAY', 'KPAY_CARD'] },
      updatedAt: { lt: cutoff }
    },
    data: { status: 'REJECTED', adminNote: 'Expirée : paiement K-PAY non confirmé après 30 min' }
  });
  if (count) logger.info(`K-PAY: expired ${count} unpaid invitation order(s)`);

  // Orders never paid at all (no K-PAY attempt, no manual reference) are
  // abandoned carts: expire them after 24 h so the admin queue stays clean.
  const manual = await prisma.invitationOrder.updateMany({
    where: {
      status: 'PENDING',
      submittedAt: null,
      transactionId: null,
      createdAt: { lt: new Date(Date.now() - MANUAL_EXPIRY_MS) }
    },
    data: { status: 'REJECTED', adminNote: 'Expirée : aucun paiement reçu sous 24 h' }
  });
  if (manual.count) logger.info(`Expired ${manual.count} unpaid invitation order(s) older than 24h`);
}

function startOrderExpiryJob() {
  const run = () => expireStaleKpayOrders().catch(err => logger.error('K-PAY order expiry failed:', err));
  const timer = setInterval(run, 5 * 60 * 1000);
  timer.unref();
  run();
}

module.exports = {
  ORDER_PREFIX,
  buildOrderExternalId,
  orderIdFromExternalId,
  confirmOrderPayment,
  expireStaleKpayOrders,
  startOrderExpiryJob
};
