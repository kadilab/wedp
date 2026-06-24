const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isAdmin, optionalAuth } = require('../middleware/auth.middleware');
const { paginationValidation } = require('../middleware/validation.middleware');
const { paginate, buildPaginationMeta } = require('../utils/helpers');
const { recordTemplateUsage } = require('../utils/marketplace');
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

    // Build where clause - approval status is the single source of truth
    const where = {
      marketplace: {
        is: { status: 'APPROVED' }
      },
      isActive: true
    };

    if (category) where.category = category;
    if (eventType) where.eventType = eventType;
    if (creatorId) where.marketplace = { is: { status: 'APPROVED', creatorId } };

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
      previewImage: t.previewImage,
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
      pagination: buildPaginationMeta(total, page, limit)
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
            status: true,
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
      pagination: buildPaginationMeta(total, page, limit)
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
      pagination: buildPaginationMeta(total, page, limit)
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
    const { description, name, eventType, category } = req.body;
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

    // Clones of a marketplace template cannot be re-published: the original
    // already exists in the marketplace and its creator keeps the commission.
    if (template.sourceTemplateId) {
      return res.status(400).json({ message: "Ce template est un clone : seul l'original peut être publié dans la marketplace" });
    }

    // Allow the creator to set the displayed name, event type and design
    // category at publish time.
    const VALID_EVENT_TYPES = ['WEDDING', 'BIRTHDAY', 'DOT', 'CEREMONY', 'CONFERENCE', 'OTHER'];
    const templateUpdate = {};
    if (name && name.trim()) templateUpdate.name = name.trim();
    if (description !== undefined) templateUpdate.description = description?.trim() || null;
    if (eventType && VALID_EVENT_TYPES.includes(eventType)) templateUpdate.eventType = eventType;
    if (category && category.trim()) templateUpdate.category = category.trim();
    if (Object.keys(templateUpdate).length > 0) {
      await prisma.template.update({ where: { id: templateId }, data: templateUpdate });
    }

    // Check existing listing. A rejected (or draft) listing can be
    // re-submitted; pending/approved listings cannot be submitted again.
    const existingMarketplace = await prisma.templateMarketplace.findUnique({
      where: { templateId }
    });

    if (existingMarketplace) {
      if (existingMarketplace.status === 'PENDING_REVIEW') {
        return res.status(400).json({ message: 'Template is already submitted and pending review' });
      }
      if (existingMarketplace.status === 'APPROVED') {
        return res.status(400).json({ message: 'Template is already approved and live on the marketplace' });
      }
    }

    const includeRefs = {
      creator: { select: { displayName: true } },
      template: { select: { name: true } }
    };

    // Price and commission are decided by the admin at review time, so the
    // initial listing keeps the schema defaults (priceUSD 0, commission 30).
    const marketplace = existingMarketplace
      ? await prisma.templateMarketplace.update({
          where: { templateId },
          data: {
            status: 'PENDING_REVIEW',
            adminNote: null,
            reviewedBy: null,
            reviewedAt: null
          },
          include: includeRefs
        })
      : await prisma.templateMarketplace.create({
          data: {
            templateId,
            creatorId: creatorProfile.id,
            status: 'PENDING_REVIEW'
          },
          include: includeRefs
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

    // Create notification for all admins
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN'] }
      },
      select: { id: true }
    });

    if (admins.length > 0) {
      await Promise.all(
        admins.map(admin =>
          prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'MARKETPLACE_SUBMISSION',
              title: 'Nouveau template en attente d\'approbation',
              message: `Le créateur "${marketplace.creator.displayName}" a soumis le template "${marketplace.template.name}" pour la marketplace.`,
              data: {
                templateMarketplaceId: marketplace.id,
                status: 'PENDING_REVIEW',
                creatorId: creatorProfile.id
              }
            }
          }).catch(err => logger.error('Error creating notification:', err))
        )
      );
    }

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

    const usageTrack = await recordTemplateUsage({ templateId, weddingId, userId });

    if (!usageTrack) {
      return res.status(404).json({ message: 'Marketplace template not found or not approved' });
    }

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


module.exports = router;
