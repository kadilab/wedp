const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { safeDeleteUploads } = require('../utils/helpers');
const { findAccessibleWedding } = require('../utils/weddingAccess');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

async function findOwnedWedding(weddingId, user) {
  return findAccessibleWedding(user, weddingId);
}

/**
 * @route   GET /api/guestbook/:weddingId
 * @desc    List all guestbook posts (incl. pending/rejected) for moderation
 * @access  Private (wedding owner or admin)
 */
router.get('/:weddingId', authenticate, async (req, res) => {
  try {
    const wedding = await findOwnedWedding(req.params.weddingId, req.user);
    if (!wedding) return res.status(404).json({ error: 'Mariage non trouvé' });

    const posts = await prisma.guestbookPost.findMany({
      where: { weddingId: wedding.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      posts,
      settings: {
        guestbookEnabled: wedding.guestbookEnabled,
        guestbookAutoApprove: wedding.guestbookAutoApprove
      }
    });
  } catch (error) {
    logger.error('Get guestbook posts error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PATCH /api/guestbook/:weddingId/settings
 * @desc    Toggle guestbook availability / moderation mode
 * @access  Private (wedding owner or admin)
 */
router.patch('/:weddingId/settings', authenticate, async (req, res) => {
  try {
    const wedding = await findOwnedWedding(req.params.weddingId, req.user);
    if (!wedding) return res.status(404).json({ error: 'Mariage non trouvé' });

    const { guestbookEnabled, guestbookAutoApprove } = req.body;

    const updated = await prisma.wedding.update({
      where: { id: wedding.id },
      data: {
        ...(guestbookEnabled !== undefined && { guestbookEnabled: !!guestbookEnabled }),
        ...(guestbookAutoApprove !== undefined && { guestbookAutoApprove: !!guestbookAutoApprove })
      },
      select: { guestbookEnabled: true, guestbookAutoApprove: true }
    });

    res.json({ settings: updated });
  } catch (error) {
    logger.error('Update guestbook settings error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PATCH /api/guestbook/:weddingId/:postId
 * @desc    Approve or reject a pending post
 * @access  Private (wedding owner or admin)
 */
router.patch('/:weddingId/:postId', authenticate, async (req, res) => {
  try {
    const wedding = await findOwnedWedding(req.params.weddingId, req.user);
    if (!wedding) return res.status(404).json({ error: 'Mariage non trouvé' });

    const { status } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const post = await prisma.guestbookPost.findFirst({
      where: { id: req.params.postId, weddingId: wedding.id }
    });
    if (!post) return res.status(404).json({ error: 'Publication non trouvée' });

    const updated = await prisma.guestbookPost.update({
      where: { id: post.id },
      data: { status }
    });

    if (status === 'APPROVED') {
      const io = req.app.get('io');
      if (io) {
        io.to(`wedding-${wedding.id}`).emit('guestbook-post', { weddingId: wedding.id, post: updated });
      }
    }

    res.json({ post: updated });
  } catch (error) {
    logger.error('Moderate guestbook post error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   DELETE /api/guestbook/:weddingId/:postId
 * @desc    Permanently delete a post
 * @access  Private (wedding owner or admin)
 */
router.delete('/:weddingId/:postId', authenticate, async (req, res) => {
  try {
    const wedding = await findOwnedWedding(req.params.weddingId, req.user);
    if (!wedding) return res.status(404).json({ error: 'Mariage non trouvé' });

    const post = await prisma.guestbookPost.findFirst({
      where: { id: req.params.postId, weddingId: wedding.id }
    });
    if (!post) return res.status(404).json({ error: 'Publication non trouvée' });

    await prisma.guestbookPost.delete({ where: { id: post.id } });
    if (post.photoUrl) await safeDeleteUploads([post.photoUrl]);

    res.json({ message: 'Publication supprimée' });
  } catch (error) {
    logger.error('Delete guestbook post error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
