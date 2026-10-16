const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { paginate, buildPaginationMeta } = require('../utils/helpers');
const { paginationValidation } = require('../middleware/validation.middleware');
const { findAccessibleWedding } = require('../utils/weddingAccess');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const { getPrintPricing, isPrintServiceEnabled, calculatePrintPrice } = require('../utils/printPricing');

const isStaff = (user) => user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

// Prices are configured by the admin (Paramètres → Impression), see
// utils/printPricing.js. Clients cannot order while the service is off.
async function ensureServiceOpen(req, res) {
  if (isStaff(req.user) || await isPrintServiceEnabled()) return true;
  res.status(403).json({ code: 'PRINT_SERVICE_DISABLED', error: 'Le service d’impression n’est pas disponible pour le moment.' });
  return false;
}

/**
 * @route   GET /api/print-orders/pricing
 * @desc    Current print pricing (admin-configured) + whether ordering is open
 * @access  Private
 */
router.get('/pricing', authenticate, async (req, res) => {
  try {
    const [pricing, enabled] = await Promise.all([getPrintPricing(), isPrintServiceEnabled()]);
    res.json({ enabled, pricing });
  } catch (error) {
    logger.error('Get print pricing error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/print-orders/calculate
 * @desc    Calculate print order price
 * @access  Private
 */
router.post('/calculate', authenticate, async (req, res) => {
  try {
    const { paperType, finish, size, doubleSided } = req.body;
    const quantity = parseInt(req.body.quantity, 10);
    const pricing = await getPrintPricing();

    if (!quantity || quantity < pricing.minQuantity) {
      return res.status(400).json({ error: `Minimum ${pricing.minQuantity} exemplaires` });
    }

    const opts = { quantity, paperType: paperType || 'premium', finish: finish || 'mat', size: size || 'A5', doubleSided: !!doubleSided };
    const { unitPrice, discountPercent, totalPrice } = calculatePrintPrice(pricing, opts);
    res.json({ ...opts, unitPrice, discountPercent, totalPrice });
  } catch (error) {
    logger.error('Calculate print price error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/print-orders
 * @desc    Create a print order
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      weddingId, quantity, paperType, finish, size, notes, doubleSided,
      shippingAddress, shippingCity, shippingCountry, shippingPhone
    } = req.body;

    if (!(await ensureServiceOpen(req, res))) return;

    if (!weddingId) {
      return res.status(400).json({ error: 'ID du mariage requis' });
    }

    const pricing = await getPrintPricing();
    if (!quantity || quantity < pricing.minQuantity) {
      return res.status(400).json({ error: `Minimum ${pricing.minQuantity} exemplaires` });
    }

    // Verify wedding ownership
    const wedding = await findAccessibleWedding(req.user, weddingId);

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage introuvable' });
    }

    // Only honor recto-verso if the couple actually configured a back side —
    // prevents a stale/tampered request from billing for something that
    // can't actually be printed.
    const wantsDoubleSided = !!doubleSided && !!wedding.printBackEnabled && !!wedding.printBackText;

    const { totalPrice: price } = calculatePrintPrice(pricing, {
      quantity: parseInt(quantity, 10),
      paperType: paperType || 'premium',
      finish: finish || 'mat',
      size: size || 'A5',
      doubleSided: wantsDoubleSided
    });

    const order = await prisma.printOrder.create({
      data: {
        weddingId,
        userId: req.user.id,
        quantity,
        paperType: paperType || 'premium',
        finish: finish || 'mat',
        size: size || 'A5',
        doubleSided: wantsDoubleSided,
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
          select: { id: true, brideName: true, groomName: true, eventType: true, eventTitle: true, honoreeName: true, slug: true }
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
          select: { id: true, brideName: true, groomName: true, eventType: true, eventTitle: true, honoreeName: true, slug: true, templateId: true }
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
