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
      where: { userId },
      include: {
        _count: {
          select: {
            marketplaceListings: { where: { status: 'APPROVED' } },
            usageTracks: true,
            payouts: true
          }
        }
      }
    });

    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

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
        templateCount: creatorProfile._count.marketplaceListings,
        totalUsages: creatorProfile._count.usageTracks,
        totalPayouts: creatorProfile._count.payouts
      }
    });
  } catch (error) {
    logger.error('Error fetching creator profile:', error);
    res.status(500).json({ message: 'Error fetching creator profile', error: error.message });
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

module.exports = router;
