const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

/**
 * Record a creator commission when a client uses an approved marketplace
 * template for a wedding. Idempotent per (weddingId, templateId): if a track
 * already exists it is returned as-is.
 *
 * The commission is created with status PENDING. It becomes APPROVED
 * (withdrawable) when the wedding is activated, and PAID once an admin
 * processes a payout that includes it.
 *
 * @returns the usage track, or null when the template is not an approved
 *          marketplace listing.
 */
async function recordTemplateUsage({ templateId, weddingId, userId }) {
  if (!templateId || !weddingId || !userId) return null;

  const marketplace = await prisma.templateMarketplace.findUnique({
    where: { templateId }
  });

  if (!marketplace || marketplace.status !== 'APPROVED') {
    return null;
  }

  // Idempotency: one commission per wedding + template.
  const existing = await prisma.templateUsageTrack.findFirst({
    where: { weddingId, templateId }
  });
  if (existing) return existing;

  const price = parseFloat(marketplace.priceUSD) || 0;
  const commissionPercentage = parseFloat(marketplace.commissionPercentage) || 0;
  const commissionAmount = (price * commissionPercentage) / 100;

  const usageTrack = await prisma.templateUsageTrack.create({
    data: {
      templateMarketplaceId: marketplace.id,
      weddingId,
      userId,
      creatorId: marketplace.creatorId,
      templateId,
      commissionAmount,
      commissionPercentage,
      status: 'PENDING'
    }
  });

  await prisma.templateMarketplace.update({
    where: { id: marketplace.id },
    data: {
      usageCount: { increment: 1 },
      revenueGenerated: { increment: price },
      popularityScore: { increment: 0.1 }
    }
  });

  logger.info(`Template usage recorded: template ${templateId} / wedding ${weddingId} (commission ${commissionAmount})`);
  return usageTrack;
}

/**
 * Approve all PENDING commissions tied to a wedding (called when the wedding
 * goes live / is activated). Returns the number of tracks approved.
 */
async function approveWeddingUsage(weddingId) {
  if (!weddingId) return 0;
  const result = await prisma.templateUsageTrack.updateMany({
    where: { weddingId, status: 'PENDING' },
    data: { status: 'APPROVED', approvedAt: new Date() }
  });
  if (result.count > 0) {
    logger.info(`Approved ${result.count} commission(s) for wedding ${weddingId}`);
  }
  return result.count;
}

module.exports = { recordTemplateUsage, approveWeddingUsage };
