const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isCreator } = require('../middleware/auth.middleware');
const { uploadSingle, handleUploadError } = require('../middleware/upload.middleware');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * @route   POST /api/creators/register
 * @desc    Create a creator profile for the current user
 * @access  Private (authenticated users)
 */
router.post('/register', authenticate, async (req, res) => {
  try {
    const { displayName, bio, website, socialLinks } = req.body;
    const userId = req.user.id;

    // Check if user is already a creator
    const existingCreator = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (existingCreator) {
      return res.status(400).json({ message: 'User is already a creator' });
    }

    // Validate required fields
    if (!displayName || displayName.trim().length === 0) {
      return res.status(400).json({ message: 'Display name is required' });
    }

    // Create creator profile
    const creatorProfile = await prisma.creatorProfile.create({
      data: {
        userId,
        displayName: displayName.trim(),
        bio: bio?.trim(),
        website: website?.trim(),
        socialLinks: socialLinks || {}
      }
    });

    // Update user to mark as creator
    await prisma.user.update({
      where: { id: userId },
      data: {
        isCreator: true,
        creatorProfileId: creatorProfile.id
      }
    });

    logger.info(`Creator profile created for user ${userId}`);

    res.status(201).json({
      message: 'Creator profile created successfully',
      creatorProfile: {
        id: creatorProfile.id,
        displayName: creatorProfile.displayName,
        bio: creatorProfile.bio,
        website: creatorProfile.website,
        verificationStatus: creatorProfile.verificationStatus,
        bankAccountVerified: creatorProfile.bankAccountVerified,
        totalEarnings: creatorProfile.totalEarnings,
        createdAt: creatorProfile.createdAt
      }
    });
  } catch (error) {
    logger.error('Error creating creator profile:', error);
    res.status(500).json({ message: 'Error creating creator profile', error: error.message });
  }
});

/**
 * @route   GET /api/creators/me
 * @desc    Get current user's creator profile
 * @access  Private (creators only)
 */
router.get('/me', authenticate, isCreator, async (req, res) => {
  try {
    const userId = req.user.id;

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    // Count marketplace listings
    const templateCount = await prisma.templateMarketplace.count({
      where: { creatorId: creatorProfile.id, status: 'APPROVED' }
    });

    // Count usage tracks
    const totalUsages = await prisma.templateUsageTrack.count({
      where: { creatorId: creatorProfile.id }
    });

    // Count payouts
    const totalPayouts = await prisma.creatorPayout.count({
      where: { creatorId: creatorProfile.id, status: 'PAID' }
    });

    // Calculate earnings summary
    const earnings = await prisma.templateUsageTrack.groupBy({
      by: ['status'],
      where: { creatorId: creatorProfile.id },
      _sum: { commissionAmount: true }
    });

    const earningsSummary = {
      pending: 0,
      approved: 0,
      paid: 0
    };

    earnings.forEach(e => {
      if (e.status === 'PENDING') earningsSummary.pending = parseFloat(e._sum.commissionAmount || 0);
      if (e.status === 'APPROVED') earningsSummary.approved = parseFloat(e._sum.commissionAmount || 0);
      if (e.status === 'PAID') earningsSummary.paid = parseFloat(e._sum.commissionAmount || 0);
    });

    res.json({
      creatorProfile: {
        id: creatorProfile.id,
        displayName: creatorProfile.displayName,
        bio: creatorProfile.bio,
        profileImage: creatorProfile.profileImage,
        bannerImage: creatorProfile.bannerImage,
        website: creatorProfile.website,
        socialLinks: creatorProfile.socialLinks,
        verificationStatus: creatorProfile.verificationStatus,
        verifiedAt: creatorProfile.verifiedAt,
        bankAccountVerified: creatorProfile.bankAccountVerified,
        totalEarnings: parseFloat(creatorProfile.totalEarnings),
        totalCommissionsEarned: parseFloat(creatorProfile.totalCommissionsEarned),
        isActive: creatorProfile.isActive,
        createdAt: creatorProfile.createdAt
      },
      earnings: earningsSummary,
      statistics: {
        templateCount,
        totalUsages,
        totalPayouts
      }
    });
  } catch (error) {
    logger.error('Error fetching creator profile:', error);
    res.status(500).json({ message: 'Error fetching creator profile', error: error.message });
  }
});

/**
 * @route   GET /api/creators/me/earnings-details
 * @desc    Paginated list of the creator's commission transactions + revenue chart data
 * @access  Private (creators only)
 */
router.get('/me/earnings-details', authenticate, isCreator, async (req, res) => {
  try {
    const userId = req.user.id;

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const { status, templateId } = req.query;

    const where = { creatorId: creatorProfile.id };
    if (status) where.status = status;
    if (templateId) where.templateId = templateId;

    const [tracks, total] = await Promise.all([
      prisma.templateUsageTrack.findMany({
        where,
        skip,
        take: limit,
        orderBy: { usedAt: 'desc' },
        include: {
          marketplace: {
            include: { template: { select: { name: true } } }
          }
        }
      }),
      prisma.templateUsageTrack.count({ where })
    ]);

    // Aggregate across ALL of the creator's transactions (not just this page)
    // for the revenue chart and the earnings summary.
    const allTracks = await prisma.templateUsageTrack.findMany({
      where: { creatorId: creatorProfile.id },
      select: { usedAt: true, commissionAmount: true, status: true, payoutId: true }
    });

    const revenueByDate = {};
    const summary = { pending: 0, approved: 0, paid: 0, available: 0, total: 0 };
    allTracks.forEach(t => {
      const amount = parseFloat(t.commissionAmount || 0);
      const date = t.usedAt.toISOString().split('T')[0];
      revenueByDate[date] = (revenueByDate[date] || 0) + amount;
      summary.total += amount;
      if (t.status === 'PENDING') summary.pending += amount;
      if (t.status === 'APPROVED') {
        summary.approved += amount;
        if (!t.payoutId) summary.available += amount; // not yet attached to a payout
      }
      if (t.status === 'PAID') summary.paid += amount;
    });

    res.json({
      earnings: tracks.map(t => ({
        id: t.id,
        templateName: t.marketplace?.template?.name || 'Template',
        templateId: t.templateId,
        commissionPercentage: parseFloat(t.commissionPercentage),
        commissionAmount: parseFloat(t.commissionAmount),
        status: t.status,
        usedAt: t.usedAt,
        approvedAt: t.approvedAt,
        inPayout: !!t.payoutId
      })),
      summary,
      revenueByDate,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching creator earnings details:', error);
    res.status(500).json({ message: 'Error fetching earnings details', error: error.message });
  }
});

/**
 * @route   PUT /api/creators/me
 * @desc    Update current user's creator profile
 * @access  Private (creators only)
 */
router.put('/me', authenticate, isCreator, async (req, res) => {
  try {
    const userId = req.user.id;
    const { displayName, bio, website, socialLinks } = req.body;

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    const updatedProfile = await prisma.creatorProfile.update({
      where: { id: creatorProfile.id },
      data: {
        ...(displayName && { displayName: displayName.trim() }),
        ...(bio && { bio: bio.trim() }),
        ...(website && { website: website.trim() }),
        ...(socialLinks && { socialLinks })
      }
    });

    res.json({
      message: 'Creator profile updated successfully',
      creatorProfile: {
        id: updatedProfile.id,
        displayName: updatedProfile.displayName,
        bio: updatedProfile.bio,
        website: updatedProfile.website,
        socialLinks: updatedProfile.socialLinks
      }
    });
  } catch (error) {
    logger.error('Error updating creator profile:', error);
    res.status(500).json({ message: 'Error updating creator profile', error: error.message });
  }
});

/**
 * @route   POST /api/creators/me/upload-profile-image
 * @desc    Upload creator profile image
 * @access  Private (creators only)
 */
router.post('/me/upload-profile-image', authenticate, isCreator, uploadSingle('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    const userId = req.user.id;
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const updatedProfile = await prisma.creatorProfile.update({
      where: { id: creatorProfile.id },
      data: { profileImage: imageUrl }
    });

    res.json({
      message: 'Profile image uploaded successfully',
      profileImage: updatedProfile.profileImage
    });
  } catch (error) {
    logger.error('Error uploading profile image:', error);
    handleUploadError(error, res);
  }
});

/**
 * @route   POST /api/creators/me/upload-banner-image
 * @desc    Upload creator banner image
 * @access  Private (creators only)
 */
router.post('/me/upload-banner-image', authenticate, isCreator, uploadSingle('bannerImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    const userId = req.user.id;
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const updatedProfile = await prisma.creatorProfile.update({
      where: { id: creatorProfile.id },
      data: { bannerImage: imageUrl }
    });

    res.json({
      message: 'Banner image uploaded successfully',
      bannerImage: updatedProfile.bannerImage
    });
  } catch (error) {
    logger.error('Error uploading banner image:', error);
    handleUploadError(error, res);
  }
});

/**
 * @route   GET /api/creators/:creatorId
 * @desc    Get public creator profile
 * @access  Public
 */
router.get('/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        displayName: true,
        bio: true,
        profileImage: true,
        bannerImage: true,
        website: true,
        socialLinks: true,
        verificationStatus: true,
        totalEarnings: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            marketplaceListings: { where: { status: 'APPROVED' } },
            usageTracks: true
          }
        }
      }
    });

    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator not found' });
    }

    // Hide inactive creators
    if (!creatorProfile.isActive) {
      return res.status(404).json({ message: 'Creator not found' });
    }

    res.json({
      creatorProfile: {
        id: creatorProfile.id,
        displayName: creatorProfile.displayName,
        bio: creatorProfile.bio,
        profileImage: creatorProfile.profileImage,
        bannerImage: creatorProfile.bannerImage,
        website: creatorProfile.website,
        socialLinks: creatorProfile.socialLinks,
        verified: creatorProfile.verificationStatus === 'VERIFIED',
        totalEarnings: parseFloat(creatorProfile.totalEarnings),
        templateCount: creatorProfile._count.marketplaceListings,
        totalUsages: creatorProfile._count.usageTracks,
        createdAt: creatorProfile.createdAt
      }
    });
  } catch (error) {
    logger.error('Error fetching creator profile:', error);
    res.status(500).json({ message: 'Error fetching creator profile', error: error.message });
  }
});

// ==================== BANK ACCOUNT ENDPOINTS ====================

/**
 * @route   GET /api/creators/me/bank-accounts
 * @desc    Get creator's bank accounts
 * @access  Private (creators only)
 */
router.get('/me/bank-accounts', authenticate, isCreator, async (req, res) => {
  try {
    const userId = req.user.id;

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    // No profile yet → no accounts. Return an empty list (not 404) so the
    // payout UI renders and the creator can add their first account.
    if (!creatorProfile) {
      return res.json({ bankAccounts: [] });
    }

    // Select only the columns the UI needs — keeps this resilient to any extra
    // columns and avoids leaking sensitive fields.
    const bankAccounts = await prisma.creatorBankAccount.findMany({
      where: { creatorId: creatorProfile.id },
      orderBy: { isDefault: 'desc' },
      select: {
        id: true,
        accountHolderName: true,
        bankName: true,
        accountNumber: true,
        isDefault: true,
        isVerified: true,
        createdAt: true
      }
    });

    res.json({
      bankAccounts: bankAccounts.map(acc => ({
        id: acc.id,
        accountHolderName: acc.accountHolderName,
        bankName: acc.bankName,
        accountNumber: acc.accountNumber ? `****${acc.accountNumber.slice(-4)}` : '****',
        isDefault: acc.isDefault,
        isVerified: acc.isVerified,
        createdAt: acc.createdAt
      }))
    });
  } catch (error) {
    // Never break the payout page on a read error — log it and return empty so
    // the creator can still (re)add an account. Real errors surface on write.
    logger.error('Error fetching bank accounts:', error);
    res.json({ bankAccounts: [] });
  }
});

/**
 * @route   POST /api/creators/me/bank-accounts
 * @desc    Add a bank account for creator
 * @access  Private (creators only)
 */
router.post('/me/bank-accounts', authenticate, isCreator, async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountHolderName, bankName, accountNumber, routingNumber, iban, swiftCode, accountType, currency, isDefault } = req.body;

    if (!accountHolderName || !bankName || (!accountNumber && !iban)) {
      return res.status(400).json({ message: 'Missing required fields: accountHolderName, bankName, and either accountNumber or IBAN' });
    }

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.creatorBankAccount.updateMany({
        where: { creatorId: creatorProfile.id },
        data: { isDefault: false }
      });
    }

    const bankAccount = await prisma.creatorBankAccount.create({
      data: {
        creatorId: creatorProfile.id,
        accountHolderName,
        bankName,
        accountNumber: accountNumber || '',
        routingNumber,
        iban,
        swiftCode,
        accountType: accountType || 'mobile_money',
        currency: currency || 'CDF',
        isDefault: isDefault ? true : false,
        // Mobile Money accounts don't need a manual verification step — the
        // payout is validated against the live operator at withdrawal time.
        isVerified: true,
        verifiedAt: new Date()
      }
    });

    logger.info(`Bank account added for creator ${creatorProfile.id}`);

    res.status(201).json({
      message: 'Bank account added successfully',
      bankAccount: {
        id: bankAccount.id,
        accountHolderName: bankAccount.accountHolderName,
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber ? `****${bankAccount.accountNumber.slice(-4)}` : '****',
        accountType: bankAccount.accountType,
        currency: bankAccount.currency,
        isDefault: bankAccount.isDefault,
        isVerified: bankAccount.isVerified,
        createdAt: bankAccount.createdAt
      }
    });
  } catch (error) {
    logger.error('Error adding bank account:', error);
    res.status(500).json({ message: 'Error adding bank account', error: error.message });
  }
});

/**
 * @route   PUT /api/creators/me/bank-accounts/:accountId
 * @desc    Update a bank account
 * @access  Private (creators only)
 */
router.put('/me/bank-accounts/:accountId', authenticate, isCreator, async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountId } = req.params;
    const { accountHolderName, bankName, accountType, isDefault } = req.body;

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    // Verify ownership
    const bankAccount = await prisma.creatorBankAccount.findUnique({
      where: { id: accountId }
    });

    if (!bankAccount || bankAccount.creatorId !== creatorProfile.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.creatorBankAccount.updateMany({
        where: { creatorId: creatorProfile.id, id: { not: accountId } },
        data: { isDefault: false }
      });
    }

    const updatedAccount = await prisma.creatorBankAccount.update({
      where: { id: accountId },
      data: {
        ...(accountHolderName && { accountHolderName }),
        ...(bankName && { bankName }),
        ...(accountType && { accountType }),
        ...(isDefault !== undefined && { isDefault })
      }
    });

    logger.info(`Bank account ${accountId} updated`);

    res.json({
      message: 'Bank account updated successfully',
      bankAccount: {
        id: updatedAccount.id,
        accountHolderName: updatedAccount.accountHolderName,
        bankName: updatedAccount.bankName,
        accountNumber: updatedAccount.accountNumber ? `****${updatedAccount.accountNumber.slice(-4)}` : '****',
        accountType: updatedAccount.accountType,
        currency: updatedAccount.currency,
        isDefault: updatedAccount.isDefault,
        isVerified: updatedAccount.isVerified
      }
    });
  } catch (error) {
    logger.error('Error updating bank account:', error);
    res.status(500).json({ message: 'Error updating bank account', error: error.message });
  }
});

/**
 * @route   DELETE /api/creators/me/bank-accounts/:accountId
 * @desc    Delete a bank account
 * @access  Private (creators only)
 */
router.delete('/me/bank-accounts/:accountId', authenticate, isCreator, async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountId } = req.params;

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    // Verify ownership
    const bankAccount = await prisma.creatorBankAccount.findUnique({
      where: { id: accountId }
    });

    if (!bankAccount || bankAccount.creatorId !== creatorProfile.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Check if it's the only account
    const accountCount = await prisma.creatorBankAccount.count({
      where: { creatorId: creatorProfile.id }
    });

    if (accountCount === 1) {
      return res.status(400).json({ message: 'Cannot delete the last bank account' });
    }

    await prisma.creatorBankAccount.delete({
      where: { id: accountId }
    });

    logger.info(`Bank account ${accountId} deleted`);

    res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    logger.error('Error deleting bank account:', error);
    res.status(500).json({ message: 'Error deleting bank account', error: error.message });
  }
});

// ==================== PAYOUT ENDPOINTS ====================

/**
 * @route   POST /api/creators/me/request-payout
 * @desc    Request a payout of the creator's approved (withdrawable) earnings
 * @access  Private (creators only)
 */
router.post('/me/request-payout', authenticate, isCreator, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bankAccountId, amount, note } = req.body;

    if (!bankAccountId || !amount) {
      return res.status(400).json({ message: 'Missing required fields: bankAccountId, amount' });
    }

    const creatorProfile = await prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    const bankAccount = await prisma.creatorBankAccount.findUnique({ where: { id: bankAccountId } });
    if (!bankAccount || bankAccount.creatorId !== creatorProfile.id) {
      return res.status(403).json({ message: 'Compte Mobile Money invalide' });
    }

    const MIN_PAYOUT = 5000; // FC (CDF)
    const requested = parseFloat(amount);
    if (Number.isNaN(requested) || requested < MIN_PAYOUT) {
      return res.status(400).json({ message: `Le montant minimum de retrait est de ${MIN_PAYOUT.toLocaleString('fr-FR')} FC` });
    }

    // Available balance = APPROVED earnings not yet attached to a payout
    const approvedEarnings = await prisma.templateUsageTrack.findMany({
      where: { creatorId: creatorProfile.id, status: 'APPROVED', payoutId: null },
      orderBy: { usedAt: 'asc' }
    });

    const availableAmount = approvedEarnings.reduce((sum, t) => sum + parseFloat(t.commissionAmount), 0);
    if (requested > availableAmount) {
      return res.status(400).json({ message: 'Payout amount exceeds available balance', availableAmount });
    }

    // Select the oldest tracks that fit within the requested amount
    const selected = approvedEarnings.reduce((acc, t) => {
      if (acc.total + parseFloat(t.commissionAmount) <= requested) {
        acc.ids.push(t.id);
        acc.total += parseFloat(t.commissionAmount);
      }
      return acc;
    }, { ids: [], total: 0 });

    const payout = await prisma.creatorPayout.create({
      data: {
        creatorId: creatorProfile.id,
        userId,
        totalAmount: selected.total,
        currency: bankAccount.currency || 'USD',
        status: 'PENDING',
        paymentMethod: 'bank_transfer',
        paymentDetails: {
          bankAccountId,
          bankName: bankAccount.bankName,
          accountHolderName: bankAccount.accountHolderName
        },
        adminNote: note || '',
        usageTracksIncluded: selected.ids
      }
    });

    await prisma.templateUsageTrack.updateMany({
      where: { id: { in: selected.ids } },
      data: { payoutId: payout.id }
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
      select: { id: true }
    });
    await Promise.all(admins.map(a =>
      prisma.notification.create({
        data: {
          userId: a.id,
          type: 'PAYOUT_REQUEST',
          title: 'Nouvelle demande de retrait',
          message: `${creatorProfile.displayName} a demandé un retrait de $${selected.total.toFixed(2)}.`,
          data: { payoutId: payout.id }
        }
      }).catch(err => logger.error('Payout notification failed:', err))
    ));

    logger.info(`Payout request ${payout.id} created for creator ${creatorProfile.id} ($${selected.total})`);

    res.status(201).json({
      message: 'Payout request submitted',
      payout: {
        id: payout.id,
        totalAmount: parseFloat(payout.totalAmount),
        status: payout.status,
        requestedAt: payout.requestedAt
      }
    });
  } catch (error) {
    logger.error('Error requesting payout:', error);
    res.status(500).json({ message: 'Error requesting payout', error: error.message });
  }
});

/**
 * @route   GET /api/creators/me/payouts
 * @desc    Creator's payout history
 * @access  Private (creators only)
 */
router.get('/me/payouts', authenticate, isCreator, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const creatorProfile = await prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    const [payouts, total] = await Promise.all([
      prisma.creatorPayout.findMany({
        where: { creatorId: creatorProfile.id },
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' }
      }),
      prisma.creatorPayout.count({ where: { creatorId: creatorProfile.id } })
    ]);

    res.json({
      payouts: payouts.map(p => ({
        id: p.id,
        totalAmount: parseFloat(p.totalAmount),
        currency: p.currency,
        status: p.status,
        requestedAt: p.requestedAt,
        processedAt: p.processedAt,
        adminNote: p.adminNote,
        transactionId: p.transactionId
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('Error fetching payout history:', error);
    res.status(500).json({ message: 'Error fetching payout history', error: error.message });
  }
});

module.exports = router;
