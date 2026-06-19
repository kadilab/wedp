const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * @route   GET /api/plans
 * @desc    Get all active plans
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });

    // Parse features JSON
    const plansWithFeatures = plans.map(plan => ({
      ...plan,
      features: plan.features || []
    }));

    res.json({ plans: plansWithFeatures });
  } catch (error) {
    logger.error('Get plans error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/plans/:id
 * @desc    Get plan by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const plan = await prisma.plan.findUnique({
      where: { id: req.params.id }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan non trouvé' });
    }

    res.json({
      plan: {
        ...plan,
        features: plan.features || []
      }
    });
  } catch (error) {
    logger.error('Get plan error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/plans
 * @desc    Create new plan (Admin only)
 * @access  Private/Admin
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const {
      name, type, price, maxGuests, maxTemplates,
      customDomain, whatsappEnabled, emailEnabled,
      pdfEnabled, analyticsEnabled, prioritySupport,
      description, features
    } = req.body;

    const plan = await prisma.plan.create({
      data: {
        name,
        type,
        price,
        maxGuests,
        maxTemplates,
        customDomain: customDomain || false,
        whatsappEnabled: whatsappEnabled || false,
        emailEnabled: emailEnabled !== false,
        pdfEnabled: pdfEnabled !== false,
        analyticsEnabled: analyticsEnabled || false,
        prioritySupport: prioritySupport || false,
        description,
        features: features || null
      }
    });

    res.status(201).json({
      message: 'Plan créé avec succès',
      plan
    });
  } catch (error) {
    logger.error('Create plan error:', error);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

/**
 * @route   PUT /api/plans/:id
 * @desc    Update plan (Admin only)
 * @access  Private/Admin
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const {
      name, price, maxGuests, maxTemplates,
      customDomain, whatsappEnabled, emailEnabled,
      pdfEnabled, analyticsEnabled, prioritySupport,
      description, features, isActive
    } = req.body;

    const plan = await prisma.plan.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(price !== undefined && { price }),
        ...(maxGuests !== undefined && { maxGuests }),
        ...(maxTemplates !== undefined && { maxTemplates }),
        ...(customDomain !== undefined && { customDomain }),
        ...(whatsappEnabled !== undefined && { whatsappEnabled }),
        ...(emailEnabled !== undefined && { emailEnabled }),
        ...(pdfEnabled !== undefined && { pdfEnabled }),
        ...(analyticsEnabled !== undefined && { analyticsEnabled }),
        ...(prioritySupport !== undefined && { prioritySupport }),
        ...(description !== undefined && { description }),
        ...(features && { features }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({
      message: 'Plan mis à jour',
      plan
    });
  } catch (error) {
    logger.error('Update plan error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

/**
 * @route   DELETE /api/plans/:id
 * @desc    Delete plan (Admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    // Check if plan is in use
    const weddingsUsingPlan = await prisma.wedding.count({
      where: { planId: req.params.id }
    });

    if (weddingsUsingPlan > 0) {
      // Soft delete
      await prisma.plan.update({
        where: { id: req.params.id },
        data: { isActive: false }
      });
      return res.json({ message: 'Plan désactivé (utilisé par des mariages existants)' });
    }

    await prisma.plan.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Plan supprimé' });
  } catch (error) {
    logger.error('Delete plan error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

module.exports = router;
