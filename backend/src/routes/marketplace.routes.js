const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isAdmin, optionalAuth } = require('../middleware/auth.middleware');
const { paginationValidation } = require('../middleware/validation.middleware');
const { paginate, buildPaginationMeta } = require('../utils/helpers');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * @route   GET /api/marketplace/templates
 * @desc    Browse marketplace templates (public, paginated)
 * @access  Public
 */
router.get('/templates', optionalAuth, paginationValidation, async (req, res) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const { category, eventType, creatorId, sort, featured } = req.query;

    // Build where clause - only show approved templates
    const where = {
      marketplace: {
        status: 'APPROVED',
        isPublished: true
      },
      isActive: true
    };

    if (category) where.category = category;
    if (eventType) where.eventType = eventType;
    if (creatorId) where.marketplace = { ...where.marketplace, creatorId };

    // Build order by based on sort parameter
    let orderBy = { marketplace: { publishedAt: 'desc' } };
    if (sort === 'popular') {
      orderBy = { marketplace: { popularityScore: 'desc' } };
    } else if (sort === 'newest') {
      orderBy = { marketplace: { publishedAt: 'desc' } };
    } else if (sort === 'highest_commission') {
      orderBy = { marketplace: { commissionPercentage: 'desc' } };
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          name: true,
          slug: true,
          thumbnail: true,
          category: true,
          eventType: true,
          marketplace: {
            select: {
              id: true,
              priceUSD: true,
              commissionPercentage: true,
              usageCount: true,
              publishedAt: true,
              creator: {
                select: {
                  id: true,
                  displayName: true,
                  profileImage: true,
                  verificationStatus: true
                }
              }
            }
          }
        }
      }),
      prisma.template.count({ where })
    ]);

    // Format response
    const formattedTemplates = templates.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      thumbnail: t.thumbnail,
      category: t.category,
      eventType: t.eventType,
      marketplace: t.marketplace ? {
        id: t.marketplace.id,
        priceUSD: parseFloat(t.marketplace.priceUSD),
        commissionPercentage: parseFloat(t.marketplace.commissionPercentage),
        usageCount: t.marketplace.usageCount,
        publishedAt: t.marketplace.publishedAt,
        creator: {
          id: t.marketplace.creator.id,
          displayName: t.marketplace.creator.displayName,
          profileImage: t.marketplace.creator.profileImage,
          verified: t.marketplace.creator.verificationStatus === 'VERIFIED'
        }
      } : null
    }));

    res.json({
      templates: formattedTemplates,
      pagination: buildPaginationMeta(page, limit, total)
    });
  } catch (error) {
    logger.error('Error fetching marketplace templates:', error);
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
});

/**
 * @route   GET /api/marketplace/templates/:templateId
 * @desc    Get marketplace template detail
 * @access  Public
 */
router.get('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        thumbnail: true,
        previewImage: true,
        category: true,
        eventType: true,
        marketplace: {
          select: {
            id: true,
            priceUSD: true,
            commissionPercentage: true,
            usageCount: true,
            publishedAt: true,
            creator: {
              select: {
                id: true,
                displayName: true,
                profileImage: true,
                bannerImage: true,
                bio: true,
                website: true,
                verificationStatus: true,
                totalEarnings: true
              }
            }
          }
        }
      }
    });

    if (!template || !template.marketplace || template.marketplace.status !== 'APPROVED') {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({
      template: {
        id: template.id,
        name: template.name,
        slug: template.slug,
        description: template.description,
        thumbnail: template.thumbnail,
        previewImage: template.previewImage,
        category: template.category,
        eventType: template.eventType,
        marketplace: {
          id: template.marketplace.id,
          priceUSD: parseFloat(template.marketplace.priceUSD),
          commissionPercentage: parseFloat(template.marketplace.commissionPercentage),
          usageCount: template.marketplace.usageCount,
          publishedAt: template.marketplace.publishedAt,
          creator: {
            id: template.marketplace.creator.id,
            displayName: template.marketplace.creator.displayName,
            profileImage: template.marketplace.creator.profileImage,
            bannerImage: template.marketplace.creator.bannerImage,
            bio: template.marketplace.creator.bio,
            website: template.marketplace.creator.website,
            verified: template.marketplace.creator.verificationStatus === 'VERIFIED',
            totalEarnings: parseFloat(template.marketplace.creator.totalEarnings)
          }
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching template detail:', error);
    res.status(500).json({ message: 'Error fetching template', error: error.message });
  }
});

/**
 * @route   GET /api/marketplace/creators
 * @desc    Get verified creators list
 * @access  Public
 */
router.get('/creators', paginationValidation, async (req, res) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const { sort } = req.query;

    let orderBy = { totalEarnings: 'desc' };
    if (sort === 'newest_verified') {
      orderBy = { verifiedAt: 'desc' };
    }

    const [creators, total] = await Promise.all([
      prisma.creatorProfile.findMany({
        where: {
          verificationStatus: 'VERIFIED',
          isActive: true
        },
        skip,
        take,
        orderBy,
        select: {
          id: true,
          displayName: true,
          bio: true,
          profileImage: true,
          website: true,
          verificationStatus: true,
          totalEarnings: true,
          createdAt: true,
          _count: {
            select: {
              marketplaceListings: { where: { status: 'APPROVED' } },
              usageTracks: true
            }
          }
        }
      }),
      prisma.creatorProfile.count({
        where: {
          verificationStatus: 'VERIFIED',
          isActive: true
        }
      })
    ]);

    const formattedCreators = creators.map(c => ({
      id: c.id,
      displayName: c.displayName,
      bio: c.bio,
      profileImage: c.profileImage,
      website: c.website,
      verified: c.verificationStatus === 'VERIFIED',
      totalEarnings: parseFloat(c.totalEarnings),
      templateCount: c._count.marketplaceListings,
      totalUsages: c._count.usageTracks,
      createdAt: c.createdAt
    }));

    res.json({
      creators: formattedCreators,
      pagination: buildPaginationMeta(page, limit, total)
    });
  } catch (error) {
    logger.error('Error fetching creators:', error);
    res.status(500).json({ message: 'Error fetching creators', error: error.message });
  }
});

/**
 * @route   GET /api/marketplace/creators/:creatorId
 * @desc    Get creator's marketplace profile with templates
 * @access  Public
 */
router.get('/creators/:creatorId', paginationValidation, async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);

    const creator = await prisma.creatorProfile.findUnique({
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
        createdAt: true
      }
    });

    if (!creator || !creator.isActive || creator.verificationStatus !== 'VERIFIED') {
      return res.status(404).json({ message: 'Creator not found' });
    }

    // Get creator's approved templates
    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where: {
          marketplace: {
            creatorId,
            status: 'APPROVED',
            isPublished: true
          },
          isActive: true
        },
        skip,
        take,
        select: {
          id: true,
          name: true,
          slug: true,
          thumbnail: true,
          category: true,
          eventType: true,
          marketplace: {
            select: {
              priceUSD: true,
              commissionPercentage: true,
              usageCount: true
            }
          }
        }
      }),
      prisma.template.count({
        where: {
          marketplace: {
            creatorId,
            status: 'APPROVED',
            isPublished: true
          },
          isActive: true
        }
      })
    ]);

    res.json({
      creator: {
        ...creator,
        totalEarnings: parseFloat(creator.totalEarnings),
        verified: creator.verificationStatus === 'VERIFIED'
      },
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        thumbnail: t.thumbnail,
        category: t.category,
        eventType: t.eventType,
        marketplace: {
          priceUSD: parseFloat(t.marketplace.priceUSD),
          commissionPercentage: parseFloat(t.marketplace.commissionPercentage),
          usageCount: t.marketplace.usageCount
        }
      })),
      pagination: buildPaginationMeta(page, limit, total)
    });
  } catch (error) {
    logger.error('Error fetching creator profile:', error);
    res.status(500).json({ message: 'Error fetching creator', error: error.message });
  }
});

/**
 * @route   POST /api/templates/:templateId/publish-marketplace
 * @desc    Publish a custom template to marketplace
 * @access  Private (creator)
 */
router.post('/:templateId/publish', authenticate, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { priceUSD, commissionPercentage, description } = req.body;
    const userId = req.user.id;

    // Get user's creator profile
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      return res.status(403).json({ message: 'User is not a creator' });
    }

    // Get template and verify ownership
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.userId !== userId) {
      return res.status(403).json({ message: 'You can only publish your own templates' });
    }

    if (!template.isCustom) {
      return res.status(400).json({ message: 'Only custom templates can be published to marketplace' });
    }

    // Check if already published
    const existingMarketplace = await prisma.templateMarketplace.findUnique({
      where: { templateId }
    });

    if (existingMarketplace) {
      return res.status(400).json({ message: 'Template is already published to marketplace' });
    }

    // Validate inputs
    const price = parseFloat(priceUSD) || 0;
    const commission = Math.min(Math.max(parseFloat(commissionPercentage) || 30, 10), 50); // 10-50% range

    // Create marketplace listing
    const marketplace = await prisma.templateMarketplace.create({
      data: {
        templateId,
        creatorId: creatorProfile.id,
        priceUSD: price,
        commissionPercentage: commission,
        status: 'PENDING_REVIEW'
      },
      include: {
        creator: {
          select: {
            displayName: true
          }
        }
      }
    });

    // Update template
    await prisma.template.update({
      where: { id: templateId },
      data: {
        isMarketplaceTemplate: true,
        marketplaceId: marketplace.id,
        creatorId: creatorProfile.id
      }
    });

    logger.info(`Template ${templateId} submitted for marketplace review by creator ${creatorProfile.id}`);

    res.status(201).json({
      message: 'Template submitted for marketplace review',
      marketplace: {
        id: marketplace.id,
        templateId: marketplace.templateId,
        status: marketplace.status,
        priceUSD: parseFloat(marketplace.priceUSD),
        commissionPercentage: parseFloat(marketplace.commissionPercentage),
        createdAt: marketplace.createdAt
      }
    });
  } catch (error) {
    logger.error('Error publishing template:', error);
    res.status(500).json({ message: 'Error publishing template', error: error.message });
  }
});

/**
 * @route   PUT /api/templates/:templateId/marketplace
 * @desc    Update marketplace listing (draft)
 * @access  Private (creator owner)
 */
router.put('/:templateId', authenticate, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { priceUSD, commissionPercentage, isPublished } = req.body;
    const userId = req.user.id;

    // Get template and verify ownership
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: { marketplace: true }
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.userId !== userId) {
      return res.status(403).json({ message: 'You can only edit your own templates' });
    }

    if (!template.marketplace) {
      return res.status(404).json({ message: 'Template is not in marketplace' });
    }

    // Only allow editing if status is DRAFT or REJECTED
    if (!['DRAFT', 'REJECTED'].includes(template.marketplace.status)) {
      return res.status(400).json({ message: 'Cannot edit marketplace listing in this status' });
    }

    const updateData = {};
    if (priceUSD !== undefined) updateData.priceUSD = parseFloat(priceUSD) || 0;
    if (commissionPercentage !== undefined) {
      updateData.commissionPercentage = Math.min(Math.max(parseFloat(commissionPercentage) || 30, 10), 50);
    }
    if (isPublished !== undefined) {
      // Can only publish if status is APPROVED
      if (isPublished && template.marketplace.status !== 'APPROVED') {
        return res.status(400).json({ message: 'Template must be approved before publishing' });
      }
      updateData.isPublished = isPublished;
    }

    const updated = await prisma.templateMarketplace.update({
      where: { id: template.marketplace.id },
      data: updateData
    });

    res.json({
      message: 'Marketplace listing updated',
      marketplace: {
        id: updated.id,
        priceUSD: parseFloat(updated.priceUSD),
        commissionPercentage: parseFloat(updated.commissionPercentage),
        isPublished: updated.isPublished,
        status: updated.status
      }
    });
  } catch (error) {
    logger.error('Error updating marketplace listing:', error);
    res.status(500).json({ message: 'Error updating listing', error: error.message });
  }
});

/**
 * @route   POST /api/marketplace/:templateId/use
 * @desc    Track template usage and record commission
 * @access  Private
 */
router.post('/:templateId/use', authenticate, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { weddingId } = req.body;
    const userId = req.user.id;

    // Get template with marketplace info
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: {
        marketplace: {
          where: { status: 'APPROVED', isPublished: true }
        }
      }
    });

    if (!template || !template.marketplace || template.marketplace.length === 0) {
      return res.status(404).json({ message: 'Marketplace template not found or not published' });
    }

    const marketplace = template.marketplace[0];

    // Create usage track
    const commissionAmount = (parseFloat(marketplace.priceUSD) * parseFloat(marketplace.commissionPercentage)) / 100;

    const usageTrack = await prisma.templateUsageTrack.create({
      data: {
        templateMarketplaceId: marketplace.id,
        weddingId,
        userId,
        creatorId: marketplace.creatorId,
        templateId,
        commissionAmount,
        commissionPercentage: marketplace.commissionPercentage,
        status: 'PENDING'
      }
    });

    // Update marketplace usage count
    await prisma.templateMarketplace.update({
      where: { id: marketplace.id },
      data: {
        usageCount: { increment: 1 },
        popularityScore: { increment: 0.1 }
      }
    });

    logger.info(`Template usage tracked: ${templateId} by user ${userId} for wedding ${weddingId}`);

    res.status(201).json({
      message: 'Template usage recorded',
      usageTrack: {
        id: usageTrack.id,
        commissionAmount: parseFloat(usageTrack.commissionAmount),
        status: usageTrack.status
      }
    });
  } catch (error) {
    logger.error('Error tracking template usage:', error);
    res.status(500).json({ message: 'Error tracking usage', error: error.message });
  }
});

/**
 * @route   GET /api/creators/me/earnings-details
 * @desc    Get detailed earnings/commissions history
 * @access  Private (creator)
 */
router.get('/creators/me/earnings-details', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { skip, take, page, limit } = paginate(req.query.page || 1, req.query.limit || 20);
    const { status, templateId } = req.query;

    // Get creator profile
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    // Build where clause
    const where = { creatorId: creatorProfile.id };
    if (status) where.status = status;
    if (templateId) where.templateId = templateId;

    const [usageTracks, total] = await Promise.all([
      prisma.templateUsageTrack.findMany({
        where,
        skip,
        take,
        orderBy: { usedAt: 'desc' },
        include: {
          template: { select: { name: true, id: true } },
          wedding: { select: { slug: true, status: true } }
        }
      }),
      prisma.templateUsageTrack.count({ where })
    ]);

    // Group by date for revenue chart
    const revenueByDate = {};
    usageTracks.forEach(track => {
      const date = new Date(track.usedAt).toLocaleDateString();
      if (!revenueByDate[date]) revenueByDate[date] = 0;
      if (track.status !== 'PENDING') {
        revenueByDate[date] += parseFloat(track.commissionAmount);
      }
    });

    res.json({
      earnings: usageTracks.map(t => ({
        id: t.id,
        templateName: t.template.name,
        templateId: t.template.id,
        weddingSlug: t.wedding?.slug,
        weddingStatus: t.wedding?.status,
        commissionAmount: parseFloat(t.commissionAmount),
        commissionPercentage: parseFloat(t.commissionPercentage),
        status: t.status,
        usedAt: t.usedAt
      })),
      revenueByDate,
      pagination: buildPaginationMeta(page, limit, total)
    });
  } catch (error) {
    logger.error('Error fetching earnings details:', error);
    res.status(500).json({ message: 'Error fetching earnings', error: error.message });
  }
});

/**
 * @route   PUT /api/marketplace/weddings/:weddingId/approve-earnings
 * @desc    Approve earnings for a wedding (PENDING -> APPROVED)
 * @access  Private (wedding creator)
 */
router.put('/weddings/:weddingId/approve-earnings', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const userId = req.user.id;

    // Verify user owns the wedding
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId }
    });

    if (!wedding) {
      return res.status(404).json({ message: 'Wedding not found' });
    }

    if (wedding.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized: Wedding does not belong to you' });
    }

    // Update all PENDING template usages for this wedding to APPROVED
    const result = await prisma.templateUsageTrack.updateMany({
      where: {
        weddingId,
        status: 'PENDING'
      },
      data: {
        status: 'APPROVED',
        approvedAt: new Date()
      }
    });

    logger.info(`Wedding ${weddingId} earnings approved: ${result.count} records updated`);

    res.json({
      message: 'Earnings approved',
      updatedCount: result.count
    });
  } catch (error) {
    logger.error('Error approving earnings:', error);
    res.status(500).json({ message: 'Error approving earnings', error: error.message });
  }
});

// ==================== PAYOUT ENDPOINTS ====================

/**
 * @route   POST /api/creators/me/request-payout
 * @desc    Request a payout of approved earnings
 * @access  Private (creators only)
 */
router.post('/creators/me/request-payout', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bankAccountId, amount, note } = req.body;

    if (!bankAccountId || !amount) {
      return res.status(400).json({ message: 'Missing required fields: bankAccountId, amount' });
    }

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    // Verify bank account belongs to creator and is verified
    const bankAccount = await prisma.creatorBankAccount.findUnique({
      where: { id: bankAccountId }
    });

    if (!bankAccount || bankAccount.creatorId !== creatorProfile.id) {
      return res.status(403).json({ message: 'Invalid bank account' });
    }

    if (!bankAccount.isVerified) {
      return res.status(400).json({ message: 'Bank account must be verified before requesting payout' });
    }

    // Calculate available balance
    const approvedEarnings = await prisma.templateUsageTrack.findMany({
      where: {
        creatorId: creatorProfile.id,
        status: 'APPROVED'
      }
    });

    const availableAmount = approvedEarnings.reduce((sum, track) => sum + parseFloat(track.commissionAmount), 0);

    if (parseFloat(amount) > availableAmount) {
      return res.status(400).json({
        message: 'Payout amount exceeds available balance',
        availableAmount
      });
    }

    if (parseFloat(amount) < 10) {
      return res.status(400).json({ message: 'Minimum payout amount is $10' });
    }

    // Create payout request
    const usageTracksToInclude = approvedEarnings
      .sort((a, b) => new Date(a.usedAt) - new Date(b.usedAt))
      .reduce((sum, track) => {
        if (sum.total + parseFloat(track.commissionAmount) <= parseFloat(amount)) {
          sum.ids.push(track.id);
          sum.total += parseFloat(track.commissionAmount);
        }
        return sum;
      }, { ids: [], total: 0 });

    const payout = await prisma.creatorPayout.create({
      data: {
        creatorId: creatorProfile.id,
        userId,
        totalAmount: parseFloat(amount),
        currency: 'USD',
        status: 'PENDING',
        paymentMethod: 'bank_transfer',
        paymentDetails: {
          bankAccountId,
          bankName: bankAccount.bankName,
          accountHolderName: bankAccount.accountHolderName
        },
        adminNote: note || '',
        usageTracksIncluded: usageTracksToInclude.ids
      }
    });

    // Update usage tracks to link to payout
    await prisma.templateUsageTrack.updateMany({
      where: { id: { in: usageTracksToInclude.ids } },
      data: { payoutId: payout.id }
    });

    logger.info(`Payout request created: ${payout.id} for creator ${creatorProfile.id}`);

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
 * @desc    Get creator's payout history
 * @access  Private (creators only)
 */
router.get('/creators/me/payouts', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { skip, take, page, limit } = paginate(req.query.page || 1, req.query.limit || 20);

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    const [payouts, total] = await Promise.all([
      prisma.creatorPayout.findMany({
        where: { creatorId: creatorProfile.id },
        skip,
        take,
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
        adminNote: p.adminNote
      })),
      pagination: buildPaginationMeta(page, limit, total)
    });
  } catch (error) {
    logger.error('Error fetching payout history:', error);
    res.status(500).json({ message: 'Error fetching payout history', error: error.message });
  }
});

module.exports = router;
