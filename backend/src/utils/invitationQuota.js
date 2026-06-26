const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Aucune invitation gratuite : toute invitation générée doit être achetée
// (anti-fraude). Mettre > 0 pour réautoriser des invitations offertes.
const FREE_QUOTA = 0;

/**
 * Quota d'invitations d'un mariage = 1 gratuite + somme des quantités des
 * commandes (InvitationOrder) approuvées. "used" est dérivé du nombre réel
 * d'invitations déjà générées, donc rien à synchroniser : approuver une
 * commande suffit, la prochaine lecture reflète automatiquement le nouveau total.
 */
async function getWeddingQuota(weddingId) {
  const [approvedAgg, used] = await Promise.all([
    prisma.invitationOrder.aggregate({
      where: { weddingId, status: 'APPROVED' },
      _sum: { quantity: true }
    }),
    prisma.invitation.count({ where: { weddingId } })
  ]);

  const purchased = approvedAgg._sum.quantity || 0;
  const totalAllowed = FREE_QUOTA + purchased;

  return {
    freeQuota: FREE_QUOTA,
    purchased,
    totalAllowed,
    used,
    remaining: Math.max(0, totalAllowed - used)
  };
}

module.exports = { getWeddingQuota, FREE_QUOTA };
