const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

/**
 * Create a notification for a user
 * @param {Object} params
 * @param {string} params.userId - Target user ID
 * @param {string} params.type - Notification type (wedding, guest, payment, rsvp, invitation, checkin, warning, info, system)
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message body
 * @param {Object} [params.data] - Additional data (e.g. { link: '/weddings/123' })
 * @param {Object} [params.io] - Socket.IO instance for real-time push
 */
async function createNotification({ userId, type, title, message, data = null, io = null }) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data
      }
    });

    // Push real-time notification via Socket.IO
    if (io) {
      io.to(`user:${userId}`).emit('notification', notification);
    }

    return notification;
  } catch (error) {
    logger.error('Create notification error:', error);
    return null;
  }
}

/**
 * Create notifications for multiple users
 * @param {Object} params
 * @param {string[]} params.userIds - Target user IDs
 * @param {string} params.type
 * @param {string} params.title
 * @param {string} params.message
 * @param {Object} [params.data]
 * @param {Object} [params.io]
 */
async function createBulkNotifications({ userIds, type, title, message, data = null, io = null }) {
  try {
    const notifications = await prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type,
        title,
        message,
        data
      }))
    });

    // Push real-time notifications
    if (io) {
      userIds.forEach(userId => {
        io.to(`user:${userId}`).emit('notification', { type, title, message, data });
      });
    }

    return notifications;
  } catch (error) {
    logger.error('Create bulk notifications error:', error);
    return null;
  }
}

/**
 * Notify every ADMIN/SUPER_ADMIN user (e.g. on a new invitation order needing validation)
 * @param {Object} params
 * @param {string} params.type
 * @param {string} params.title
 * @param {string} params.message
 * @param {Object} [params.data]
 * @param {Object} [params.io]
 */
async function notifyAdmins({ type, title, message, data = null, io = null }) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true }
    });
    if (admins.length === 0) return null;

    return await createBulkNotifications({
      userIds: admins.map(a => a.id),
      type,
      title,
      message,
      data,
      io
    });
  } catch (error) {
    logger.error('Notify admins error:', error);
    return null;
  }
}

/**
 * Notification templates for common events
 */
const NotificationTemplates = {
  // RSVP received
  rsvpReceived: (guestName, weddingTitle, status) => ({
    type: 'rsvp',
    title: 'Nouvelle réponse RSVP',
    message: `${guestName} a ${status === 'CONFIRMED' ? 'confirmé sa présence' : 'décliné l\'invitation'} pour "${weddingTitle}".`
  }),

  // Payment validated
  paymentApproved: (planName) => ({
    type: 'payment',
    title: 'Paiement validé',
    message: `Votre paiement pour le plan "${planName}" a été approuvé. Profitez de toutes les fonctionnalités !`
  }),

  // Payment rejected
  paymentRejected: (reason) => ({
    type: 'payment',
    title: 'Paiement refusé',
    message: `Votre paiement a été refusé. ${reason ? `Raison : ${reason}` : 'Veuillez contacter le support.'}`
  }),

  // Invitation quota purchase approved
  invitationOrderApproved: (quantity) => ({
    type: 'payment',
    title: 'Achat de quota approuvé',
    message: `Votre achat de ${quantity} invitation${quantity > 1 ? 's' : ''} a été approuvé. Vous pouvez générer ces invitations dès maintenant.`
  }),

  // Invitation quota purchase rejected
  invitationOrderRejected: (reason) => ({
    type: 'payment',
    title: 'Achat de quota refusé',
    message: `Votre commande d'invitations a été refusée. ${reason ? `Raison : ${reason}` : 'Veuillez contacter le support.'}`
  }),

  // New invitation order submitted by a client — sent to all admins
  newInvitationOrderSubmitted: (quantity, weddingLabel) => ({
    type: 'payment',
    title: 'Nouvelle commande d\'invitations',
    message: `${weddingLabel} a soumis une commande de ${quantity} invitation${quantity > 1 ? 's' : ''} en attente de validation.`
  }),

  // Guest checked in
  guestCheckedIn: (guestName, weddingTitle) => ({
    type: 'checkin',
    title: 'Check-in effectué',
    message: `${guestName} vient d'arriver à "${weddingTitle}".`
  }),

  // Invitation sent
  invitationSent: (count, weddingTitle) => ({
    type: 'invitation',
    title: 'Invitations envoyées',
    message: `${count} invitation${count > 1 ? 's' : ''} envoyée${count > 1 ? 's' : ''} pour "${weddingTitle}".`
  }),

  // Wedding created
  weddingCreated: (weddingTitle) => ({
    type: 'wedding',
    title: 'Mariage créé',
    message: `Votre mariage "${weddingTitle}" a été créé avec succès. Commencez à ajouter vos invités !`
  }),

  // Plan expiring soon
  planExpiring: (planName, daysLeft) => ({
    type: 'warning',
    title: 'Plan bientôt expiré',
    message: `Votre plan "${planName}" expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}. Renouvelez-le pour continuer.`
  }),

  // Welcome
  welcome: (firstName) => ({
    type: 'info',
    title: 'Bienvenue sur WeddingInvite Pro !',
    message: `Bonjour ${firstName} ! Créez votre premier mariage et commencez à envoyer des invitations élégantes.`
  }),

  // New guest added
  guestAdded: (count, weddingTitle) => ({
    type: 'guest',
    title: `${count > 1 ? 'Invités ajoutés' : 'Invité ajouté'}`,
    message: `${count} invité${count > 1 ? 's' : ''} ajouté${count > 1 ? 's' : ''} à "${weddingTitle}".`
  })
};

module.exports = {
  createNotification,
  createBulkNotifications,
  notifyAdmins,
  NotificationTemplates
};
