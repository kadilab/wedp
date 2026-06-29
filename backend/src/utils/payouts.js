// Settlement helpers for creator payouts. Shared by the K-PAY webhook and the
// admin status-poll endpoint so both apply the exact same (idempotent) effects.
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

// Mark a payout PAID + flip its earnings to PAID + notify the creator. Idempotent.
async function markPayoutPaid(payoutId, transactionId = null) {
  const payout = await prisma.creatorPayout.findUnique({ where: { id: payoutId } });
  if (!payout) return null;
  if (payout.status === 'PAID') return payout; // idempotent

  const updated = await prisma.creatorPayout.update({
    where: { id: payoutId },
    data: { status: 'PAID', processedAt: new Date(), transactionId: transactionId || payout.transactionId }
  });

  const ids = Array.isArray(payout.usageTracksIncluded) ? payout.usageTracksIncluded : [];
  if (ids.length) {
    await prisma.templateUsageTrack.updateMany({ where: { id: { in: ids } }, data: { status: 'PAID' } });
  }
  await prisma.notification.create({
    data: {
      userId: payout.userId,
      type: 'PAYOUT_PAID',
      title: 'Retrait effectué',
      message: `Votre retrait de $${parseFloat(payout.totalAmount).toFixed(2)} a été envoyé.`,
      data: { payoutId }
    }
  }).catch(() => {});

  logger.info(`Payout ${payoutId} marked PAID`);
  return updated;
}

// Mark a payout REJECTED and release its earnings so it can be requested again.
async function markPayoutFailed(payoutId, event = 'payout.failed', reason = null) {
  const payout = await prisma.creatorPayout.findUnique({ where: { id: payoutId } });
  if (!payout || payout.status === 'PAID') return payout || null;

  const updated = await prisma.creatorPayout.update({
    where: { id: payoutId },
    data: { status: 'REJECTED', processedAt: new Date(), adminNote: `K-PAY ${event}: ${reason || 'n/a'}` }
  });
  const ids = Array.isArray(payout.usageTracksIncluded) ? payout.usageTracksIncluded : [];
  if (ids.length) {
    await prisma.templateUsageTrack.updateMany({ where: { id: { in: ids } }, data: { payoutId: null } });
  }
  logger.info(`Payout ${payoutId} ${event}`);
  return updated;
}

module.exports = { markPayoutPaid, markPayoutFailed };
