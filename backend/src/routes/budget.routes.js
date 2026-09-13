const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { findAccessibleWedding } = require('../utils/weddingAccess');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Same access level as guests/tables: owner + accepted collaborators may see
// and edit budget items (it's event-planning data, not a destructive or
// payment action, so it isn't restricted to the owner like deleting the
// event or buying invitation quota).

function buildSummary(items) {
  const totalPlanned = items.reduce((sum, i) => sum + parseFloat(i.plannedAmount), 0);
  const totalPaid = items.reduce((sum, i) => sum + parseFloat(i.paidAmount), 0);
  const byCategory = {};
  for (const item of items) {
    const key = item.category;
    if (!byCategory[key]) byCategory[key] = { category: key, planned: 0, paid: 0 };
    byCategory[key].planned += parseFloat(item.plannedAmount);
    byCategory[key].paid += parseFloat(item.paidAmount);
  }
  return {
    totalPlanned,
    totalPaid,
    remaining: totalPlanned - totalPaid,
    byCategory: Object.values(byCategory).sort((a, b) => b.planned - a.planned)
  };
}

/**
 * @route   GET /api/budget/:weddingId
 * @desc    List an event's budget items + summary totals (planned/paid,
 *          per-category breakdown).
 * @access  Private (owner/collaborator)
 */
router.get('/:weddingId', authenticate, async (req, res) => {
  try {
    const wedding = await findAccessibleWedding(req.user, req.params.weddingId);
    if (!wedding) return res.status(404).json({ error: 'Événement non trouvé' });

    const items = await prisma.weddingBudgetItem.findMany({
      where: { weddingId: wedding.id },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ items, summary: buildSummary(items) });
  } catch (error) {
    logger.error('Get budget items error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du budget' });
  }
});

/**
 * @route   POST /api/budget/:weddingId
 * @desc    Add a budget item (vendor/expense line).
 * @access  Private (owner/collaborator)
 */
router.post('/:weddingId', authenticate, async (req, res) => {
  try {
    const wedding = await findAccessibleWedding(req.user, req.params.weddingId);
    if (!wedding) return res.status(404).json({ error: 'Événement non trouvé' });

    const { category, vendorName, plannedAmount, paidAmount, status, notes } = req.body || {};
    const categoryName = String(category || '').trim();
    const planned = parseFloat(plannedAmount);
    if (!categoryName) return res.status(400).json({ error: 'La catégorie est requise' });
    if (!Number.isFinite(planned) || planned < 0) return res.status(400).json({ error: 'Montant prévu invalide' });

    const item = await prisma.weddingBudgetItem.create({
      data: {
        weddingId: wedding.id,
        category: categoryName,
        vendorName: (vendorName || '').trim() || null,
        plannedAmount: planned,
        paidAmount: Number.isFinite(parseFloat(paidAmount)) ? parseFloat(paidAmount) : 0,
        status: ['PLANNED', 'DEPOSIT_PAID', 'PAID'].includes(status) ? status : 'PLANNED',
        notes: (notes || '').trim() || null
      }
    });

    res.status(201).json({ message: 'Dépense ajoutée', item });
  } catch (error) {
    logger.error('Create budget item error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la dépense' });
  }
});

/**
 * @route   PUT /api/budget/:weddingId/:itemId
 * @desc    Update a budget item.
 * @access  Private (owner/collaborator)
 */
router.put('/:weddingId/:itemId', authenticate, async (req, res) => {
  try {
    const wedding = await findAccessibleWedding(req.user, req.params.weddingId);
    if (!wedding) return res.status(404).json({ error: 'Événement non trouvé' });

    const existing = await prisma.weddingBudgetItem.findFirst({
      where: { id: req.params.itemId, weddingId: wedding.id }
    });
    if (!existing) return res.status(404).json({ error: 'Dépense non trouvée' });

    const { category, vendorName, plannedAmount, paidAmount, status, notes } = req.body || {};
    if (plannedAmount !== undefined && !(parseFloat(plannedAmount) >= 0)) {
      return res.status(400).json({ error: 'Montant prévu invalide' });
    }
    if (paidAmount !== undefined && !(parseFloat(paidAmount) >= 0)) {
      return res.status(400).json({ error: 'Montant payé invalide' });
    }

    const item = await prisma.weddingBudgetItem.update({
      where: { id: existing.id },
      data: {
        ...(category !== undefined && { category: String(category).trim() }),
        ...(vendorName !== undefined && { vendorName: (vendorName || '').trim() || null }),
        ...(plannedAmount !== undefined && { plannedAmount: parseFloat(plannedAmount) }),
        ...(paidAmount !== undefined && { paidAmount: parseFloat(paidAmount) }),
        ...(status !== undefined && ['PLANNED', 'DEPOSIT_PAID', 'PAID'].includes(status) && { status }),
        ...(notes !== undefined && { notes: (notes || '').trim() || null })
      }
    });

    res.json({ message: 'Dépense mise à jour', item });
  } catch (error) {
    logger.error('Update budget item error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la dépense' });
  }
});

/**
 * @route   DELETE /api/budget/:weddingId/:itemId
 * @desc    Remove a budget item.
 * @access  Private (owner/collaborator)
 */
router.delete('/:weddingId/:itemId', authenticate, async (req, res) => {
  try {
    const wedding = await findAccessibleWedding(req.user, req.params.weddingId);
    if (!wedding) return res.status(404).json({ error: 'Événement non trouvé' });

    const existing = await prisma.weddingBudgetItem.findFirst({
      where: { id: req.params.itemId, weddingId: wedding.id }
    });
    if (!existing) return res.status(404).json({ error: 'Dépense non trouvée' });

    await prisma.weddingBudgetItem.delete({ where: { id: existing.id } });
    res.json({ message: 'Dépense supprimée' });
  } catch (error) {
    logger.error('Delete budget item error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la dépense' });
  }
});

module.exports = router;
