const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

/**
 * Resolve the APPROVED marketplace listing that should earn the commission for
 * a given template. If the template is a clone, follow its lineage so the
 * ORIGINAL creator is credited (never the cloner).
 */
async function getApprovedMarketplace(templateId) {
  if (!templateId) return null;
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { id: true, sourceTemplateId: true }
  });
  if (!template) return null;

  const marketplaceTemplateId = template.sourceTemplateId || template.id;
  const marketplace = await prisma.templateMarketplace.findUnique({
    where: { templateId: marketplaceTemplateId }
  });
  return marketplace && marketplace.status === 'APPROVED' ? marketplace : null;
}

/**
 * Mark that a wedding uses an approved marketplace template (bumps the usage
 * counter). Called when a wedding is created with a marketplace template.
 * This does NOT create earnings — the creator is paid from real invitation
 * purchases (see recordOrderCommission).
 */
async function recordTemplateUsage({ templateId, weddingId }) {
  if (!templateId || !weddingId) return null;
  const marketplace = await getApprovedMarketplace(templateId);
  if (!marketplace) return null;

  await prisma.templateMarketplace.update({
    where: { id: marketplace.id },
    data: { usageCount: { increment: 1 }, popularityScore: { increment: 0.1 } }
  });
  logger.info(`Marketplace usage: template ${templateId} chosen for wedding ${weddingId}`);
  return marketplace;
}

/**
 * Credit the creator's commission when a client actually pays for invitations.
 * The commission is a percentage of the invitation order amount (the real
 * money the client spends), credited as APPROVED (withdrawable) since the
 * admin has just confirmed the payment.
 *
 * @returns the created earning track, or null when the wedding's template is
 *          not an approved marketplace template.
 */
async function recordOrderCommission({ order }) {
  if (!order || !order.weddingId) return null;

  const wedding = await prisma.wedding.findUnique({
    where: { id: order.weddingId },
    select: { templateId: true, userId: true }
  });
  if (!wedding || !wedding.templateId) return null;

  const marketplace = await getApprovedMarketplace(wedding.templateId);
  if (!marketplace) return null;

  const orderAmount = parseFloat(order.totalAmount) || 0;
  const commissionPercentage = parseFloat(marketplace.commissionPercentage) || 0;
  const commissionAmount = (orderAmount * commissionPercentage) / 100;
  if (commissionAmount <= 0) return null;

  const track = await prisma.templateUsageTrack.create({
    data: {
      templateMarketplaceId: marketplace.id,
      weddingId: order.weddingId,
      userId: wedding.userId,
      creatorId: marketplace.creatorId,
      templateId: marketplace.templateId,
      commissionAmount,
      commissionPercentage,
      status: 'APPROVED',
      approvedAt: new Date()
    }
  });

  await prisma.templateMarketplace.update({
    where: { id: marketplace.id },
    data: { revenueGenerated: { increment: orderAmount } }
  });

  logger.info(`Commission credited: $${commissionAmount.toFixed(2)} to creator ${marketplace.creatorId} from a $${orderAmount} order (wedding ${order.weddingId})`);
  return track;
}

module.exports = { recordTemplateUsage, recordOrderCommission, getApprovedMarketplace };
