const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { uploadSingle, handleUploadError } = require('../middleware/upload.middleware');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * @route   GET /api/backgrounds
 * @desc    Get all public backgrounds + user's own backgrounds
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { category } = req.query;

    const where = {
      OR: [
        { isPublic: true },
        { uploadedBy: req.user.id }
      ],
      ...(category && category !== 'all' && { category })
    };

    const backgrounds = await prisma.backgroundImage.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const categories = await prisma.backgroundImage.findMany({
      where: { OR: [{ isPublic: true }, { uploadedBy: req.user.id }] },
      select: { category: true },
      distinct: ['category']
    });

    res.json({
      backgrounds,
      categories: categories.map(c => c.category)
    });
  } catch (error) {
    logger.error('Get backgrounds error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/backgrounds/upload
 * @desc    Upload a custom background image
 * @access  Private
 */
router.post('/upload', authenticate, uploadSingle('background'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image uploadée' });
    }

    const { name, category } = req.body;
    const bgPath = `/uploads/backgrounds/${req.file.filename}`;

    const background = await prisma.backgroundImage.create({
      data: {
        name: name || req.file.originalname.replace(/\.[^/.]+$/, ''),
        url: bgPath,
        thumbnailUrl: bgPath,
        category: category || 'custom',
        isPublic: false,
        uploadedBy: req.user.id
      }
    });

    res.status(201).json({
      message: 'Arrière-plan uploadé avec succès',
      background
    });
  } catch (error) {
    logger.error('Upload background error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

/**
 * @route   POST /api/backgrounds/from-url
 * @desc    Add a background from an online URL
 * @access  Private
 */
router.post('/from-url', authenticate, async (req, res) => {
  try {
    const { name, url, category } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL requise' });
    }

    const background = await prisma.backgroundImage.create({
      data: {
        name: name || 'Image en ligne',
        url,
        thumbnailUrl: url,
        category: category || 'online',
        isPublic: false,
        uploadedBy: req.user.id
      }
    });

    res.status(201).json({
      message: 'Arrière-plan ajouté avec succès',
      background
    });
  } catch (error) {
    logger.error('Add background from URL error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/backgrounds/admin
 * @desc    Admin: Upload a public background
 * @access  Private/Admin
 */
router.post('/admin', authenticate, isAdmin, uploadSingle('background'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image uploadée' });
    }

    const { name, category } = req.body;
    const bgPath = `/uploads/backgrounds/${req.file.filename}`;

    const background = await prisma.backgroundImage.create({
      data: {
        name: name || req.file.originalname.replace(/\.[^/.]+$/, ''),
        url: bgPath,
        thumbnailUrl: bgPath,
        category: category || 'general',
        isPublic: true,
        uploadedBy: req.user.id
      }
    });

    res.status(201).json({
      message: 'Arrière-plan public créé',
      background
    });
  } catch (error) {
    logger.error('Admin upload background error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   DELETE /api/backgrounds/:id
 * @desc    Delete a background
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const background = await prisma.backgroundImage.findUnique({
      where: { id: req.params.id }
    });

    if (!background) {
      return res.status(404).json({ error: 'Arrière-plan introuvable' });
    }

    // Only owner or admin can delete
    if (background.uploadedBy !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    await prisma.backgroundImage.delete({ where: { id: req.params.id } });

    res.json({ message: 'Arrière-plan supprimé' });
  } catch (error) {
    logger.error('Delete background error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
