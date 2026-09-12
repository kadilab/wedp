const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { findOwnedWedding } = require('../utils/weddingAccess');
const { createNotification, NotificationTemplates } = require('../utils/notifications');
const { eventDisplayName } = require('../utils/helpers');
const logger = require('../utils/logger');

const prisma = new PrismaClient();
const MAX_COLLABORATORS = 5;

/**
 * @route   POST /api/collaborators/:weddingId/invite
 * @desc    Generate a shareable invite link
 * @access  Private (wedding owner only)
 */
router.post('/:weddingId/invite', authenticate, async (req, res) => {
  try {
    const wedding = await findOwnedWedding(req.user, req.params.weddingId);
    if (!wedding) return res.status(404).json({ error: 'Mariage non trouvé' });

    const activeCount = await prisma.weddingCollaborator.count({
      where: { weddingId: wedding.id, status: { in: ['PENDING', 'ACCEPTED'] } }
    });
    if (activeCount >= MAX_COLLABORATORS) {
      return res.status(400).json({ error: `Maximum ${MAX_COLLABORATORS} collaborateurs par événement` });
    }

    const collaborator = await prisma.weddingCollaborator.create({
      data: {
        weddingId: wedding.id,
        inviteToken: uuidv4(),
        invitedBy: req.user.id
      }
    });

    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    res.status(201).json({
      inviteToken: collaborator.inviteToken,
      url: `${baseUrl}/collab/${collaborator.inviteToken}`
    });
  } catch (error) {
    logger.error('Create collaborator invite error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/collaborators/:weddingId
 * @desc    List active collaborators (pending + accepted)
 * @access  Private (wedding owner only)
 */
router.get('/:weddingId', authenticate, async (req, res) => {
  try {
    const wedding = await findOwnedWedding(req.user, req.params.weddingId);
    if (!wedding) return res.status(404).json({ error: 'Mariage non trouvé' });

    const collaborators = await prisma.weddingCollaborator.findMany({
      where: { weddingId: wedding.id, status: { in: ['PENDING', 'ACCEPTED'] } },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    res.json({
      collaborators: collaborators.map(c => ({
        id: c.id,
        status: c.status,
        createdAt: c.createdAt,
        acceptedAt: c.acceptedAt,
        user: c.user,
        url: c.status === 'PENDING' ? `${baseUrl}/collab/${c.inviteToken}` : null
      }))
    });
  } catch (error) {
    logger.error('List collaborators error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   DELETE /api/collaborators/:weddingId/:collaboratorId
 * @desc    Revoke a collaborator, or cancel a pending invite
 * @access  Private (wedding owner only)
 */
router.delete('/:weddingId/:collaboratorId', authenticate, async (req, res) => {
  try {
    const wedding = await findOwnedWedding(req.user, req.params.weddingId);
    if (!wedding) return res.status(404).json({ error: 'Mariage non trouvé' });

    const collaborator = await prisma.weddingCollaborator.findFirst({
      where: { id: req.params.collaboratorId, weddingId: wedding.id }
    });
    if (!collaborator) return res.status(404).json({ error: 'Collaborateur non trouvé' });

    await prisma.weddingCollaborator.update({
      where: { id: collaborator.id },
      data: { status: 'REVOKED' }
    });

    res.json({ message: 'Collaborateur retiré' });
  } catch (error) {
    logger.error('Revoke collaborator error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/collaborators/accept/:token
 * @desc    Accept an invite link (any authenticated user)
 * @access  Private
 */
router.post('/accept/:token', authenticate, async (req, res) => {
  try {
    const invite = await prisma.weddingCollaborator.findUnique({
      where: { inviteToken: req.params.token },
      include: { wedding: true }
    });

    if (!invite || invite.status === 'REVOKED') {
      return res.status(404).json({ error: 'Lien d\'invitation invalide ou expiré' });
    }

    if (invite.wedding.userId === req.user.id) {
      return res.status(400).json({ error: 'Vous êtes déjà propriétaire de cet événement' });
    }

    if (invite.status === 'ACCEPTED') {
      if (invite.userId === req.user.id) {
        return res.json({ weddingId: invite.weddingId, message: 'Vous avez déjà accès à cet événement' });
      }
      return res.status(410).json({ error: 'Ce lien a déjà été utilisé' });
    }

    const alreadyCollaborator = await prisma.weddingCollaborator.findFirst({
      where: { weddingId: invite.weddingId, userId: req.user.id, status: 'ACCEPTED' }
    });
    if (alreadyCollaborator) {
      return res.json({ weddingId: invite.weddingId, message: 'Vous avez déjà accès à cet événement' });
    }

    const updated = await prisma.weddingCollaborator.update({
      where: { id: invite.id },
      data: { userId: req.user.id, status: 'ACCEPTED', acceptedAt: new Date() }
    });

    const notif = NotificationTemplates.collaboratorJoined(
      `${req.user.firstName} ${req.user.lastName}`,
      eventDisplayName(invite.wedding)
    );
    createNotification({
      userId: invite.wedding.userId,
      ...notif,
      data: { link: `/weddings/${invite.weddingId}/collaborators`, weddingId: invite.weddingId },
      io: req.app.get('io')
    }).catch(err => logger.error('Collaborator notification failed:', err));

    res.json({ weddingId: updated.weddingId, message: 'Vous avez maintenant accès à cet événement' });
  } catch (error) {
    logger.error('Accept collaborator invite error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
