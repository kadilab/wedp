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

    // Revenue grouped by day across all of the creator's transactions
    // (the frontend slices the last 30 days for its chart).
    const allTracks = await prisma.templateUsageTrack.findMany({
      where: { creatorId: creatorProfile.id },
      select: { usedAt: true, commissionAmount: true }
    });

    const revenueByDate = {};
    allTracks.forEach(t => {
      const date = t.usedAt.toISOString().split('T')[0];
      revenueByDate[date] = (revenueByDate[date] || 0) + parseFloat(t.commissionAmount || 0);
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
        approvedAt: t.approvedAt
      })),
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

    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    const bankAccounts = await prisma.creatorBankAccount.findMany({
      where: { creatorId: creatorProfile.id },
      orderBy: { isDefault: 'desc' }
    });

    res.json({
      bankAccounts: bankAccounts.map(acc => ({
        id: acc.id,
        accountHolderName: acc.accountHolderName,
        bankName: acc.bankName,
        accountNumber: acc.accountNumber ? `****${acc.accountNumber.slice(-4)}` : '****',
        accountType: acc.accountType,
        currency: acc.currency,
        isDefault: acc.isDefault,
        isVerified: acc.isVerified,
        createdAt: acc.createdAt
      }))
    });
  } catch (error) {
    logger.error('Error fetching bank accounts:', error);
    res.status(500).json({ message: 'Error fetching bank accounts', error: error.message });
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
        accountType: accountType || 'checking',
        currency: currency || 'USD',
        isDefault: isDefault ? true : false
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

module.exports = router;
