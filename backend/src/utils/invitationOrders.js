const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');
const { recordOrderCommission } = require('./marketplace');
const { createNotification, NotificationTemplates } = require('./notifications');
const { sendInvitationOrderReceiptEmail } = require('./email');

const prisma = new PrismaClient();

/**
 * Approve an invitation quota order and run all side effects. Idempotent:
 * an order that is already APPROVED is returned unchanged.
 *
 * Shared by the admin manual-approval route and the K-PAY payment webhook.
 *
 * @param {string} orderId
 * @param {object} opts
 * @param {string|null} opts.processedBy  admin user id, or null for automatic (webhook)
 * @param {object|null} opts.io           socket.io instance for live notifications
 * @returns {Promise<{order: object, alreadyApproved: boolean}>}
 */
async function approveInvitationOrder(orderId, { processedBy = null, io = null } = {}) {
  const order = await prisma.invitationOrder.findUnique({
    where: { id: orderId },
    include: { wedding: true, user: true }
  });

  if (!order) {
    throw new Error(`Invitation order ${orderId} not found`);
  }

  if (order.status === 'APPROVED') {
    return { order, alreadyApproved: true };
  }

  const updatedOrder = await prisma.invitationOrder.update({
    where: { id: orderId },
    data: {
      status: 'APPROVED',
      processedAt: new Date(),
      processedBy
    }
  });

  // Credit the creator commission for the wedding's marketplace template.
  await recordOrderCommission({ order }).catch(err =>
    logger.error('recordOrderCommission failed during order approval:', err)
  );

  // Record coupon usage only on approval (mirrors the manual flow).
  if (order.couponId) {
    await prisma.coupon.update({
      where: { id: order.couponId },
      data: { usedCount: { increment: 1 } }
    }).catch(err => logger.error('Coupon usedCount increment failed:', err));
    await prisma.couponUsage.create({
      data: { couponId: order.couponId, userId: order.userId }
    }).catch(err => logger.error('CouponUsage create failed:', err));
  }

  await prisma.log.create({
    data: {
      userId: processedBy || order.userId,
      action: 'PAYMENT',
      entity: 'invitation_order',
      entityId: orderId,
      details: { status: 'APPROVED', quantity: order.quantity, totalAmount: order.totalAmount, via: processedBy ? 'admin' : 'kpay' }
    }
  }).catch(err => logger.error('Order approval log failed:', err));

  try {
    const approveNotif = NotificationTemplates.invitationOrderApproved(order.quantity);
    await createNotification({
      userId: order.userId,
      ...approveNotif,
      data: { link: `/weddings/${order.weddingId}/invitations`, orderId: order.id },
      io
    });
  } catch (err) {
    logger.error('Invitation order approve notification failed:', err);
  }

  // Email receipt to the buyer (async, best-effort — never blocks approval).
  if (order.user?.email) {
    sendInvitationOrderReceiptEmail(order.user, updatedOrder, order.wedding)
      .catch(err => logger.error('Invitation order receipt email failed:', err));
  }

  return { order: updatedOrder, alreadyApproved: false };
}

module.exports = { approveInvitationOrder };
