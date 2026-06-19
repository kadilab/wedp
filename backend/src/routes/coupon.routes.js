const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { createCouponValidation, paginationValidation } = require('../middleware/validation.middleware');
const { paginate, buildPaginationMeta } = require('../utils/helpers');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * @route   GET /api/coupons
 * @desc    Get all coupons (Admin only)
 * @access  Private/Admin
 */
router.get('/', authenticate, isAdmin, paginationValidation, async (req, res) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const { isActive } = req.query;

    const where = {
      ...(isActive !== undefined && { isActive: isActive === 'true' })
    };

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { usages: true }
          }
        }
      }),
      prisma.coupon.count({ where })
    ]);

    res.json({
      coupons,
      pagination: buildPaginationMeta(total, page, limit)
    });
  } catch (error) {
    logger.error('Get coupons error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/coupons/validate
 * @desc    Validate a coupon code
 * @access  Private
 */
router.post('/validate', authenticate, async (req, res) => {
  try {
    const { code, amount } = req.body;

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        validFrom: { lte: new Date() },
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } }
        ]
      }
    });

    if (!coupon) {
      return res.status(400).json({ error: 'Code coupon invalide ou expiré', valid: false });
    }

    // Check max uses
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ error: 'Ce coupon a atteint sa limite d\'utilisation', valid: false });
    }

    // Check min purchase
    if (coupon.minPurchase && amount < parseFloat(coupon.minPurchase)) {
      return res.status(400).json({ 
        error: `Montant minimum requis: ${coupon.minPurchase}€`,
        valid: false 
      });
    }

    // Check if user already used this coupon
    const alreadyUsed = await prisma.couponUsage.findFirst({
      where: {
        couponId: coupon.id,
        userId: req.user.id
      }
    });

    if (alreadyUsed) {
      return res.status(400).json({ error: 'Vous avez déjà utilisé ce coupon', valid: false });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (amount * parseFloat(coupon.discountValue)) / 100;
    } else {
      discount = parseFloat(coupon.discountValue);
    }

    const finalAmount = Math.max(0, amount - discount);

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description
      },
      discount,
      finalAmount
    });
  } catch (error) {
    logger.error('Validate coupon error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/coupons
 * @desc    Create coupon (Admin only)
 * @access  Private/Admin
 */
router.post('/', authenticate, isAdmin, createCouponValidation, async (req, res) => {
  try {
    const { code, description, discountType, discountValue, maxUses, minPurchase, validFrom, validUntil } = req.body;

    // Check for duplicate code
    const existing = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (existing) {
      return res.status(400).json({ error: 'Ce code coupon existe déjà' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        discountType,
        discountValue,
        maxUses,
        minPurchase,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null
      }
    });

    res.status(201).json({
      message: 'Coupon créé avec succès',
      coupon
    });
  } catch (error) {
    logger.error('Create coupon error:', error);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

/**
 * @route   PUT /api/coupons/:id
 * @desc    Update coupon (Admin only)
 * @access  Private/Admin
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { description, discountType, discountValue, maxUses, minPurchase, validUntil, isActive } = req.body;

    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: {
        ...(description !== undefined && { description }),
        ...(discountType && { discountType }),
        ...(discountValue !== undefined && { discountValue }),
        ...(maxUses !== undefined && { maxUses }),
        ...(minPurchase !== undefined && { minPurchase }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({
      message: 'Coupon mis à jour',
      coupon
    });
  } catch (error) {
    logger.error('Update coupon error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

/**
 * @route   DELETE /api/coupons/:id
 * @desc    Delete coupon (Admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await prisma.coupon.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Coupon supprimé' });
  } catch (error) {
    logger.error('Delete coupon error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

module.exports = router;
