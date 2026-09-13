const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { findAccessibleWedding } = require('../utils/weddingAccess');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * @route   GET /api/gifts/:weddingId
 * @desc    List an event's gift contributions + summary (total raised, count).
 *          Includes pending ones so the organizer can see payments in flight.
 * @access  Private (owner/collaborator)
 */
router.get('/:weddingId', authenticate, async (req, res) => {
  try {
    const wedding = await findAccessibleWedding(req.user, req.params.weddingId);
    if (!wedding) return res.status(404).json({ error: 'Événement non trouvé' });

    const [contributions, approvedAgg] = await Promise.all([
      prisma.giftContribution.findMany({
        where: { weddingId: wedding.id },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.giftContribution.aggregate({
        where: { weddingId: wedding.id, status: 'APPROVED' },
        _sum: { amount: true },
        _count: true
      })
    ]);

    res.json({
      contributions,
      summary: {
        totalRaised: approvedAgg._sum.amount || 0,
        contributorsCount: approvedAgg._count || 0,
        goal: wedding.giftRegistryGoal,
        enabled: wedding.giftRegistryEnabled
      }
    });
  } catch (error) {
    logger.error('Get gift contributions error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des cadeaux' });
  }
});

module.exports = router;
