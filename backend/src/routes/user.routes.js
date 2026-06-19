const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadSingle, handleUploadError } = require('../middleware/upload.middleware');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Apply auth middleware to all routes
router.use(authenticate);

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        weddings: {
          select: {
            id: true,
            plan: {
              select: {
                id: true,
                name: true,
                type: true,
                maxGuests: true
              }
            }
          },
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            weddings: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Transform response to include plan at top level for backward compatibility
    const { weddings, ...userData } = user;
    const plan = weddings?.[0]?.plan || null;

    res.json({ 
      user: {
        ...userData,
        plan
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone })
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true
      }
    });

    res.json({
      message: 'Profil mis à jour avec succès',
      user
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
});

/**
 * @route   POST /api/users/avatar
 * @desc    Upload/update user avatar
 * @access  Private
 */
router.post('/avatar', uploadSingle('avatar'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    // Delete old avatar if exists
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatar: true }
    });

    if (currentUser?.avatar) {
      const oldPath = path.join(__dirname, '../../', currentUser.avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarPath },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true
      }
    });

    res.json({
      message: 'Photo de profil mise à jour',
      user
    });
  } catch (error) {
    logger.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la photo' });
  }
});

/**
 * @route   DELETE /api/users/avatar
 * @desc    Remove user avatar
 * @access  Private
 */
router.delete('/avatar', async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatar: true }
    });

    if (currentUser?.avatar) {
      const oldPath = path.join(__dirname, '../../', currentUser.avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true
      }
    });

    res.json({
      message: 'Photo de profil supprimée',
      user
    });
  } catch (error) {
    logger.error('Delete avatar error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la photo' });
  }
});

/**
 * @route   PUT /api/users/password
 * @desc    Change password
 * @access  Private
 */
router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Erreur lors du changement de mot de passe' });
  }
});

/**
 * @route   PUT /api/users/email
 * @desc    Change email
 * @access  Private
 */
router.put('/email', async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res.status(400).json({ error: 'Nouvel email et mot de passe requis' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: 'Format d\'email invalide' });
    }

    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Verify password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mot de passe incorrect' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        email: newEmail,
        emailVerified: false
      }
    });

    res.json({ message: 'Email modifié avec succès' });
  } catch (error) {
    logger.error('Change email error:', error);
    res.status(500).json({ error: 'Erreur lors du changement d\'email' });
  }
});

/**
 * @route   GET /api/users/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      userId: req.user.id,
      ...(unreadOnly === 'true' && { readAt: null })
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: req.user.id, readAt: null }
      })
    ]);

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/users/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date(), isRead: true }
    });

    res.json({ message: 'Notification marquée comme lue' });
  } catch (error) {
    logger.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/users/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/notifications/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        readAt: null
      },
      data: { readAt: new Date(), isRead: true }
    });

    res.json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (error) {
    logger.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   DELETE /api/users/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/notifications/:id', async (req, res) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    await prisma.notification.delete({
      where: { id: notification.id }
    });

    res.json({ message: 'Notification supprimée' });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const [weddingsCount, totalGuests, confirmedGuests, checkedIn, latestWedding] = await Promise.all([
      prisma.wedding.count({ where: { userId: req.user.id } }),
      prisma.guest.count({
        where: { wedding: { userId: req.user.id } }
      }),
      prisma.guest.count({
        where: {
          wedding: { userId: req.user.id },
          rsvpStatus: 'CONFIRMED'
        }
      }),
      prisma.checkIn.count({
        where: { wedding: { userId: req.user.id } }
      }),
      prisma.wedding.findFirst({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        include: { plan: true }
      })
    ]);

    const plan = latestWedding?.plan || null;

    res.json({
      stats: {
        weddings: weddingsCount,
        totalGuests,
        confirmedGuests,
        checkedIn,
        plan: {
          name: plan?.name || 'Aucun plan',
          type: plan?.type || null,
          maxGuests: plan?.maxGuests || 50,
          maxWeddings: 1,
          expiresAt: null
        },
        limits: {
          guestsUsed: totalGuests,
          guestsMax: plan?.maxGuests || 50,
          weddingsUsed: weddingsCount,
          weddingsMax: 1
        }
      }
    });
  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', async (req, res) => {
  try {
    const { password, confirmation } = req.body;

    if (confirmation !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({ error: 'Confirmation requise' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mot de passe incorrect' });
    }

    // Delete all related data
    await prisma.$transaction(async (tx) => {
      // Get all weddings
      const weddings = await tx.wedding.findMany({
        where: { userId: req.user.id },
        select: { id: true }
      });

      const weddingIds = weddings.map(w => w.id);

      // Delete check-ins
      await tx.checkIn.deleteMany({
        where: { weddingId: { in: weddingIds } }
      });

      // Delete invitations
      await tx.invitation.deleteMany({
        where: { weddingId: { in: weddingIds } }
      });

      // Delete guests
      await tx.guest.deleteMany({
        where: { weddingId: { in: weddingIds } }
      });

      // Delete weddings
      await tx.wedding.deleteMany({
        where: { userId: req.user.id }
      });

      // Delete payments
      await tx.payment.deleteMany({
        where: { userId: req.user.id }
      });

      // Delete coupon usages
      await tx.couponUsage.deleteMany({
        where: { userId: req.user.id }
      });

      // Delete notifications
      await tx.notification.deleteMany({
        where: { userId: req.user.id }
      });

      // Delete user
      await tx.user.delete({
        where: { id: req.user.id }
      });
    });

    res.json({ message: 'Compte supprimé avec succès' });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du compte' });
  }
});

module.exports = router;
