const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { paginate, buildPaginationMeta } = require('../utils/helpers');
const { paginationValidation } = require('../middleware/validation.middleware');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Print pricing configuration
const PRINT_PRICING = {
  paperType: {
    standard: 0,
    premium: 0.50,
    luxury: 1.50
  },
  finish: {
    mat: 0,
    glossy: 0.20,
    satin: 0.30
  },
  size: {
    A6: 2.00,
    A5: 3.00,
    custom: 4.50
  }
};

function calculatePrintPrice(quantity, paperType, finish, size) {
  const basePrice = PRINT_PRICING.size[size] || PRINT_PRICING.size.A5;
  const paperExtra = PRINT_PRICING.paperType[paperType] || 0;
  const finishExtra = PRINT_PRICING.finish[finish] || 0;
  const unitPrice = basePrice + paperExtra + finishExtra;
  // Volume discount
  let discount = 0;
  if (quantity >= 200) discount = 0.20;
  else if (quantity >= 100) discount = 0.15;
  else if (quantity >= 50) discount = 0.10;
  
  const total = unitPrice * quantity * (1 - discount);
  return Math.round(total * 100) / 100;
}

/**
 * @route   GET /api/print-orders/pricing
 * @desc    Get print pricing info
 * @access  Private
 */
router.get('/pricing', authenticate, (req, res) => {
  res.json({
    pricing: PRINT_PRICING,
    discounts: {
      '50+': '10%',
      '100+': '15%',
      '200+': '20%'
    }
  });
});

/**
 * @route   POST /api/print-orders/calculate
 * @desc    Calculate print order price
 * @access  Private
 */
router.post('/calculate', authenticate, (req, res) => {
  const { quantity, paperType, finish, size } = req.body;
  
  if (!quantity || quantity < 10) {
    return res.status(400).json({ error: 'Minimum 10 exemplaires' });
  }

  const price = calculatePrintPrice(quantity, paperType || 'premium', finish || 'mat', size || 'A5');
  
  res.json({
    quantity,
    paperType: paperType || 'premium',
    finish: finish || 'mat',
    size: size || 'A5',
    unitPrice: Math.round((price / quantity) * 100) / 100,
    totalPrice: price
  });
});

/**
 * @route   POST /api/print-orders
 * @desc    Create a print order
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { 
      weddingId, quantity, paperType, finish, size, notes,
      shippingAddress, shippingCity, shippingCountry, shippingPhone
    } = req.body;

    if (!weddingId) {
      return res.status(400).json({ error: 'ID du mariage requis' });
    }

    if (!quantity || quantity < 10) {
      return res.status(400).json({ error: 'Minimum 10 exemplaires' });
    }

    // Verify wedding ownership
    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage introuvable' });
    }

    const price = calculatePrintPrice(
      quantity, 
      paperType || 'premium', 
      finish || 'mat', 
      size || 'A5'
    );

    const order = await prisma.printOrder.create({
      data: {
        weddingId,
        userId: req.user.id,
        quantity,
        paperType: paperType || 'premium',
        finish: finish || 'mat',
        size: size || 'A5',
        notes,
        price,
        shippingAddress,
        shippingCity,
        shippingCountry,
        shippingPhone
      }
    });

    // Update wedding
    await prisma.wedding.update({
      where: { id: weddingId },
      data: { wantsPrintService: true, printQuantity: quantity, printPaperType: paperType, printFinish: finish, printSize: size }
    });

    res.status(201).json({
      message: 'Commande d\'impression créée',
      order
    });
  } catch (error) {
    logger.error('Create print order error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/print-orders
 * @desc    Get user's print orders
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const where = (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')
      ? {}
      : { userId: req.user.id };

    const orders = await prisma.printOrder.findMany({
      where,
      include: {
        wedding: {
          select: { id: true, brideName: true, groomName: true, eventType: true, eventTitle: true, slug: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ orders });
  } catch (error) {
    logger.error('Get print orders error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/print-orders/:id
 * @desc    Get single print order
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await prisma.printOrder.findUnique({
      where: { id: req.params.id },
      include: {
        wedding: {
          select: { id: true, brideName: true, groomName: true, eventType: true, eventTitle: true, slug: true, templateId: true }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    if (order.userId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    res.json({ order });
  } catch (error) {
    logger.error('Get print order error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/print-orders/:id/status
 * @desc    Update print order status (Admin)
 * @access  Private/Admin
 */
router.put('/:id/status', authenticate, isAdmin, async (req, res) => {
  try {
    const { status, trackingNumber, estimatedDelivery } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PRINTING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const updateData = { status };
    
    if (status === 'CONFIRMED') updateData.processedAt = new Date();
    if (status === 'SHIPPED') {
      updateData.shippedAt = new Date();
      if (trackingNumber) updateData.trackingNumber = trackingNumber;
    }
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery);

    const order = await prisma.printOrder.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ message: `Statut mis à jour: ${status}`, order });
  } catch (error) {
    logger.error('Update print order status error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   DELETE /api/print-orders/:id
 * @desc    Cancel a print order
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const order = await prisma.printOrder.findUnique({
      where: { id: req.params.id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    if (order.userId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    if (['PRINTING', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
      return res.status(400).json({ error: 'Impossible d\'annuler une commande en cours de production' });
    }

    await prisma.printOrder.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });

    res.json({ message: 'Commande annulée' });
  } catch (error) {
    logger.error('Cancel print order error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
