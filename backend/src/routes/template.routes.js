const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { paginationValidation } = require('../middleware/validation.middleware');
const { uploadSingle, uploadMultiple, handleUploadError } = require('../middleware/upload.middleware');
const { generateSlug, paginate, buildPaginationMeta } = require('../utils/helpers');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const CANVAS_WIDTH_DEFAULT = 800;
const CANVAS_HEIGHT_DEFAULT = 1120;

/**
 * @route   GET /api/templates
 * @desc    Get all templates
 * @access  Public
 */
router.get('/', paginationValidation, async (req, res) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const { category, eventType, premium, all } = req.query;

    // Common filters
    const where = {
      ...(category && { category }),
      ...(eventType && { eventType }),
      ...(premium !== undefined && { isPremium: premium === 'true' })
    };

    if (all === 'true') {
      // Admin view: base templates only (incl. inactive). Marketplace
      // (creator) templates are managed from the marketplace screens.
      where.isCustom = false;
    } else {
      // Client gallery: active base templates + APPROVED marketplace templates.
      where.isActive = true;
      where.OR = [
        { isCustom: false },
        { isCustom: true, marketplace: { is: { status: 'APPROVED' } } }
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          thumbnail: true,
          previewImage: true,
          backgroundUrl: true,
          backgroundOpacity: true,
          category: true,
          eventType: true,
          pricePerInvitation: true,
          isPremium: true,
          allowBackgroundChange: true,
          colorScheme: true,
          previewImages: true,
          config: true,
          canvasWidth: true,
          canvasHeight: true,
          createdAt: true,
          isActive: true,
          isCustom: true,
          marketplace: {
            select: {
              priceUSD: true,
              commissionPercentage: true,
              creator: { select: { displayName: true } }
            }
          },
          _count: {
            select: { weddings: true }
          }
        }
      }),
      prisma.template.count({ where })
    ]);

    res.json({
      templates,
      pagination: buildPaginationMeta(total, page, limit)
    });
  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/templates/mine
 * @desc    Get templates forked/owned by the authenticated user
 * @access  Private
 */
router.get('/mine', authenticate, async (req, res) => {
  try {
    const templates = await prisma.template.findMany({
      where: { userId: req.user.id, isCustom: true },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        previewImage: true,
        backgroundUrl: true,
        backgroundOpacity: true,
        category: true,
        eventType: true,
        pricePerInvitation: true,
        config: true,
        canvasWidth: true,
        canvasHeight: true,
        updatedAt: true,
        marketplaceStatus: true,
        sourceTemplateId: true,
        description: true,
        marketplace: {
          select: {
            status: true,
            priceUSD: true,
            commissionPercentage: true,
            adminNote: true
          }
        },
        weddings: {
          select: { id: true, brideName: true, groomName: true }
        }
      }
    });
    res.json({ templates });
  } catch (error) {
    logger.error('Get my templates error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/templates/categories
 * @desc    Get template categories
 * @access  Public
 */
router.get('/categories', async (req, res) => {
  const categories = [
    { value: 'ELEGANT', label: 'Élégant', icon: '👑' },
    { value: 'MODERN', label: 'Moderne', icon: '✨' },
    { value: 'ROMANTIC', label: 'Romantique', icon: '💕' },
    { value: 'MINIMALIST', label: 'Minimaliste', icon: '⬜' },
    { value: 'TRADITIONAL', label: 'Traditionnel', icon: '🏛️' }
  ];
  res.json({ categories });
});

/**
 * @route   GET /api/templates/:id
 * @desc    Get template by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        thumbnail: true,
        previewImage: true,
        backgroundUrl: true,
        backgroundOpacity: true,
        htmlContent: true,
        cssContent: true,
        config: true,
        category: true,
        eventType: true,
        pricePerInvitation: true,
        isPremium: true,
        isActive: true,
        allowBackgroundChange: true,
        colorScheme: true,
        canvasWidth: true,
        canvasHeight: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        isCustom: true,
        marketplaceStatus: true,
        sourceTemplateId: true,
        previewImages: true
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    res.json({ template });
  } catch (error) {
    logger.error('Get template error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/templates/slug/:slug
 * @desc    Get template by slug
 * @access  Public
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const template = await prisma.template.findUnique({
      where: { slug: req.params.slug }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    res.json({ template });
  } catch (error) {
    logger.error('Get template by slug error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/templates
 * @desc    Create template (Admin only)
 * @access  Private/Admin
 */
/**
 * @route   POST /api/templates/upload-icon
 * @desc    Upload an icon image (PNG/SVG) for programme labels
 * @access  Private/Admin
 */
router.post('/upload-icon', authenticate, isAdmin, uploadSingle('icon'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image uploadée' });
    }
    const iconPath = `/uploads/icons/${req.file.filename}`;
    res.json({ iconUrl: iconPath });
  } catch (error) {
    logger.error('Upload icon error:', error);
    res.status(500).json({ error: "Erreur lors de l'upload de l'icône" });
  }
});

/**
 * @route   POST /api/templates/upload-background
 * @desc    Upload a background image (before template creation)
 * @access  Private/Admin
 */
router.post('/upload-background', authenticate, isAdmin, uploadSingle('templateBackground'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image uploadée' });
    }
    const backgroundPath = `/uploads/template-backgrounds/${req.file.filename}`;
    res.json({ backgroundUrl: backgroundPath });
  } catch (error) {
    logger.error('Upload background error:', error);
    res.status(500).json({ error: "Erreur lors de l'upload" });
  }
});

/**
 * @route   POST /api/templates/upload-preview
 * @desc    Upload a preview image for template gallery display
 * @access  Private/Admin
 */
router.post('/upload-preview', authenticate, isAdmin, uploadSingle('previewImage'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image uploadée' });
    }
    const previewPath = `/uploads/templates/${req.file.filename}`;
    res.json({ previewUrl: previewPath });
  } catch (error) {
    logger.error('Upload preview error:', error);
    res.status(500).json({ error: "Erreur lors de l'upload" });
  }
});

/**
 * @route   POST /api/templates
 * @desc    Create template with full design data (background + elements)
 * @access  Private/Admin
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const {
      name, description, category, eventType, isPremium,
      backgroundUrl, backgroundOpacity,
      designElements, canvasWidth, canvasHeight,
      allowBackgroundChange, previewImage,
      margins, selectedFormat, pricePerInvitation
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom du template est requis' });
    }

    const slug = generateSlug(name);

    // Check for duplicate slug
    const existing = await prisma.template.findUnique({ where: { slug } });
    if (existing) {
      return res.status(400).json({ error: 'Un template avec ce nom existe déjà' });
    }

    // Ensure all design elements are preserved with complete properties
    const cleanDesignElements = (designElements || []).map(el => ({
      id: el.id,
      type: el.type,
      label: el.label,
      content: el.content,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      fontSize: el.fontSize ?? 16,
      fontFamily: el.fontFamily || 'Montserrat',
      fontWeight: el.fontWeight ?? 'normal',
      fontStyle: el.fontStyle ?? 'normal',
      color: el.color || '#000000',
      textAlign: el.textAlign ?? 'center',
      verticalAlign: el.verticalAlign ?? 'middle',
      visible: el.visible ?? true,
      letterSpacing: el.letterSpacing ?? 0,
      lineHeight: el.lineHeight ?? 1.2,
      textTransform: el.textTransform ?? 'none',
      locked: el.locked ?? false,
      textShadow: el.textShadow ?? 'none',
      shadowColor: el.shadowColor ?? '#000000',
      zIndex: el.zIndex ?? 0,
      dateFormat: el.dateFormat || 'datetime',
      curve: el.curve ?? 0,
      autoFit: el.autoFit ?? false,
      iconUrl: el.iconUrl || '',
      iconName: el.iconName || '',
      iconColor: el.iconColor || '',
      // Photo element styling (border/opacity/radius/cadrage)
      objectFit: el.objectFit || 'cover',
      objectPosition: el.objectPosition || 'center',
      imageScale: el.imageScale ?? 100,
      rotation: el.rotation ?? 0,
      opacity: el.opacity ?? 100,
      borderWidth: el.borderWidth ?? 0,
      borderColor: el.borderColor || '#FFFFFF',
      borderOpacity: el.borderOpacity ?? 100,
      borderRadius: el.borderRadius ?? 0,
      shape: el.shape || 'rect',
      customClipPath: el.customClipPath || ''
    }));

    const config = {
      designElements: cleanDesignElements,
      canvasWidth: canvasWidth || CANVAS_WIDTH_DEFAULT,
      canvasHeight: canvasHeight || CANVAS_HEIGHT_DEFAULT,
      margins: margins || { top: 0, right: 0, bottom: 0, left: 0 },
      selectedFormat: selectedFormat || 'a5-portrait',
      backgroundImage: backgroundUrl || null,
      backgroundOpacity: backgroundOpacity || 100
    };

    const template = await prisma.template.create({
      data: {
        name: name.trim(),
        slug,
        description: description || null,
        category: category || 'MODERN',
        eventType: eventType || 'WEDDING',
        isPremium: isPremium || false,
        backgroundUrl: backgroundUrl || null,
        backgroundOpacity: backgroundOpacity || 100,
        previewImage: previewImage || backgroundUrl || null,
        allowBackgroundChange: allowBackgroundChange !== undefined ? allowBackgroundChange : true,
        canvasWidth: canvasWidth || CANVAS_WIDTH_DEFAULT,
        canvasHeight: canvasHeight || CANVAS_HEIGHT_DEFAULT,
        pricePerInvitation: parseFloat(pricePerInvitation) || 0,
        config
      }
    });

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'CREATE',
        entity: 'template',
        entityId: template.id,
        details: { name }
      }
    });

    res.status(201).json({
      message: 'Template créé avec succès',
      template
    });
  } catch (error) {
    logger.error('Create template error:', error);
    res.status(500).json({ error: 'Erreur lors de la création du template' });
  }
});

/**
 * @route   POST /api/templates/:id/fork
 * @desc    Create a user-owned copy of a template for customization
 * @access  Private
 */
router.post('/:id/fork', authenticate, async (req, res) => {
  try {
    const source = await prisma.template.findUnique({
      where: { id: req.params.id }
    });

    if (!source) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    // Fork rules:
    // - Admin base templates (not custom): anyone can fork (normal flow).
    // - Approved marketplace templates: anyone can fork to customize, but the
    //   clone keeps a pointer to the original so the original creator earns the
    //   commission (and the clone cannot be re-published).
    // - Another user's private custom template: forbidden.
    const isOwner = source.userId === req.user.id;
    const isApprovedMarketplace = source.marketplaceStatus === 'APPROVED';

    if (source.isCustom && !isOwner && !isApprovedMarketplace) {
      return res.status(403).json({ error: "Vous ne pouvez pas cloner le template d'un autre utilisateur" });
    }

    // Lineage points to the original marketplace template. Propagate it so a
    // clone-of-a-clone still resolves to the original creator.
    let sourceTemplateId = source.sourceTemplateId || null;
    if (!sourceTemplateId && isApprovedMarketplace && !isOwner) {
      sourceTemplateId = source.id;
    }

    const slug = `${source.slug}-user-${req.user.id.slice(0, 8)}-${Date.now()}`;

    const forked = await prisma.template.create({
      data: {
        name: source.name,
        slug,
        description: source.description,
        thumbnail: source.thumbnail,
        previewImage: source.previewImage,
        backgroundUrl: source.backgroundUrl,
        backgroundOpacity: source.backgroundOpacity,
        htmlContent: source.htmlContent,
        cssContent: source.cssContent,
        config: source.config,
        category: source.category,
        eventType: source.eventType,
        // Templates owned by a creator are premium.
        isPremium: !!req.user.isCreator,
        isActive: true,
        allowBackgroundChange: source.allowBackgroundChange,
        colorScheme: source.colorScheme,
        canvasWidth: source.canvasWidth,
        canvasHeight: source.canvasHeight,
        userId: req.user.id,
        isCustom: true,
        sourceTemplateId
      }
    });

    res.status(201).json({ message: 'Template dupliqué', template: forked });
  } catch (error) {
    logger.error('Fork template error:', error);
    res.status(500).json({ error: 'Erreur lors de la duplication du template' });
  }
});

/**
 * @route   POST /api/templates/blank
 * @desc    Create an empty custom template owned by the current user
 * @access  Private
 */
router.post('/blank', authenticate, async (req, res) => {
  try {
    const { name, eventType } = req.body || {};
    const baseName = (name && name.trim()) || 'Nouveau template';
    const slug = `${generateSlug(baseName)}-${req.user.id.slice(0, 8)}-${Date.now()}`;

    const template = await prisma.template.create({
      data: {
        name: baseName,
        slug,
        description: '',
        category: 'MODERN',
        eventType: eventType || 'WEDDING',
        config: { designElements: [], canvasWidth: CANVAS_WIDTH_DEFAULT, canvasHeight: CANVAS_HEIGHT_DEFAULT },
        canvasWidth: CANVAS_WIDTH_DEFAULT,
        canvasHeight: CANVAS_HEIGHT_DEFAULT,
        // Templates owned by a creator are premium.
        isPremium: !!req.user.isCreator,
        isActive: true,
        allowBackgroundChange: true,
        userId: req.user.id,
        isCustom: true
      }
    });

    res.status(201).json({ message: 'Template vierge créé', template });
  } catch (error) {
    logger.error('Create blank template error:', error);
    res.status(500).json({ error: 'Erreur lors de la création du template' });
  }
});

/**
 * @route   PUT /api/templates/:id/design
 * @desc    Save template design configuration (background, element positions, styles)
 * @access  Private (Admin or template owner)
 */
router.put('/:id/design', authenticate, async (req, res) => {
  try {
    const { designElements, backgroundUrl, backgroundImage, backgroundOpacity, canvasWidth, canvasHeight, margins, selectedFormat } = req.body;

    const template = await prisma.template.findUnique({
      where: { id: req.params.id }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    // Allow admin or the owner of a custom template
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    const isOwner = template.isCustom && template.userId === req.user.id;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // backgroundImage from frontend, backgroundUrl as fallback
    const bgValue = backgroundImage || backgroundUrl;

    // Ensure all design elements are preserved with complete properties
    const cleanDesignElements = (designElements || (template.config?.designElements) || []).map(el => ({
      id: el.id,
      type: el.type,
      label: el.label,
      content: el.content,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      fontSize: el.fontSize ?? 16,
      fontFamily: el.fontFamily || 'Montserrat',
      fontWeight: el.fontWeight ?? 'normal',
      fontStyle: el.fontStyle ?? 'normal',
      color: el.color || '#000000',
      textAlign: el.textAlign ?? 'center',
      verticalAlign: el.verticalAlign ?? 'middle',
      visible: el.visible ?? true,
      letterSpacing: el.letterSpacing ?? 0,
      lineHeight: el.lineHeight ?? 1.2,
      textTransform: el.textTransform ?? 'none',
      locked: el.locked ?? false,
      textShadow: el.textShadow ?? 'none',
      shadowColor: el.shadowColor ?? '#000000',
      zIndex: el.zIndex ?? 0,
      dateFormat: el.dateFormat || 'datetime',
      curve: el.curve ?? 0,
      autoFit: el.autoFit ?? false,
      iconUrl: el.iconUrl || '',
      iconName: el.iconName || '',
      iconColor: el.iconColor || '',
      // Photo element styling (border/opacity/radius/cadrage)
      objectFit: el.objectFit || 'cover',
      objectPosition: el.objectPosition || 'center',
      imageScale: el.imageScale ?? 100,
      rotation: el.rotation ?? 0,
      opacity: el.opacity ?? 100,
      borderWidth: el.borderWidth ?? 0,
      borderColor: el.borderColor || '#FFFFFF',
      borderOpacity: el.borderOpacity ?? 100,
      borderRadius: el.borderRadius ?? 0,
      shape: el.shape || 'rect',
      customClipPath: el.customClipPath || ''
    }));

    const updatedConfig = {
      ...(template.config || {}),
      designElements: cleanDesignElements,
      canvasWidth: canvasWidth || CANVAS_WIDTH_DEFAULT,
      canvasHeight: canvasHeight || CANVAS_HEIGHT_DEFAULT,
      margins: margins || { top: 0, right: 0, bottom: 0, left: 0 },
      selectedFormat: selectedFormat || 'custom',
      backgroundOpacity: backgroundOpacity !== undefined ? backgroundOpacity : (template.config?.backgroundOpacity || 100)
    };

    // Store backgroundImage in config for PDF generator
    if (bgValue !== undefined) {
      updatedConfig.backgroundImage = bgValue;
    }
    if (backgroundOpacity !== undefined) {
      updatedConfig.backgroundOpacity = backgroundOpacity;
    }

    const updateData = {
      config: updatedConfig,
      canvasWidth: canvasWidth || CANVAS_WIDTH_DEFAULT,
      canvasHeight: canvasHeight || CANVAS_HEIGHT_DEFAULT
    };

    if (bgValue !== undefined) {
      updateData.backgroundUrl = bgValue;
      updateData.previewImage = bgValue; // Always update preview image with background
    }
    if (backgroundOpacity !== undefined) {
      updateData.backgroundOpacity = backgroundOpacity;
    }

    await prisma.template.update({
      where: { id: req.params.id },
      data: updateData
    });

    // Log update
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'template',
        entityId: template.id,
        details: { action: 'design_update' }
      }
    });

    res.json({
      message: 'Design sauvegardé avec succès',
      config: updatedConfig
    });
  } catch (error) {
    logger.error('Save template design error:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde du design' });
  }
});

/**
 * @route   PUT /api/templates/:id
 * @desc    Update template (Admin only)
 * @access  Private/Admin
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const {
      name, description, htmlContent, cssContent, category, eventType,
      isPremium, colorScheme, isActive, config, previewImage,
      allowBackgroundChange, backgroundUrl, backgroundOpacity,
      canvasWidth, canvasHeight, pricePerInvitation
    } = req.body;

    const template = await prisma.template.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(htmlContent !== undefined && { htmlContent }),
        ...(cssContent !== undefined && { cssContent }),
        ...(previewImage !== undefined && { previewImage }),
        ...(backgroundUrl !== undefined && { backgroundUrl }),
        ...(backgroundOpacity !== undefined && { backgroundOpacity }),
        ...(canvasWidth !== undefined && { canvasWidth }),
        ...(canvasHeight !== undefined && { canvasHeight }),
        ...(category && { category }),
        ...(eventType && { eventType }),
        ...(isPremium !== undefined && { isPremium }),
        ...(colorScheme && { colorScheme }),
        ...(config !== undefined && { config }),
        ...(isActive !== undefined && { isActive }),
        ...(allowBackgroundChange !== undefined && { allowBackgroundChange }),
        ...(pricePerInvitation !== undefined && { pricePerInvitation: parseFloat(pricePerInvitation) || 0 })
      }
    });

    // Log update
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'template',
        entityId: template.id
      }
    });

    res.json({
      message: 'Template mis à jour',
      template
    });
  } catch (error) {
    logger.error('Update template error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

/**
 * @route   POST /api/templates/:id/thumbnail
 * @desc    Upload template thumbnail
 * @access  Private/Admin
 */
router.post('/:id/thumbnail', authenticate, isAdmin, uploadSingle('thumbnail'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image uploadée' });
    }

    const thumbnailPath = `/uploads/images/${req.file.filename}`;

    await prisma.template.update({
      where: { id: req.params.id },
      data: { thumbnail: thumbnailPath }
    });

    res.json({
      message: 'Thumbnail mis à jour',
      thumbnail: thumbnailPath
    });
  } catch (error) {
    logger.error('Upload thumbnail error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

/**
 * @route   POST /api/templates/:id/background
 * @desc    Upload template background image
 * @access  Private
 */
router.post('/:id/background', authenticate, uploadSingle('templateBackground'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image uploadée' });
    }

    const backgroundPath = `/uploads/template-backgrounds/${req.file.filename}`;

    // Update template config with background
    const template = await prisma.template.findUnique({
      where: { id: req.params.id }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    const config = template.config || {};
    config.backgroundImage = backgroundPath;

    await prisma.template.update({
      where: { id: req.params.id },
      data: { config }
    });

    res.json({
      message: 'Image de fond mise à jour',
      backgroundImage: backgroundPath
    });
  } catch (error) {
    logger.error('Upload template background error:', error);
    res.status(500).json({ error: "Erreur lors de l'upload" });
  }
});

/**
 * @route   POST /api/templates/:id/preview-upload
 * @desc    Upload a single preview image for the template
 * @access  Private (Admin)
 */
router.post('/:id/preview-upload', authenticate, isAdmin, uploadSingle('preview'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image uploadée' });
    }

    const previewPath = `/uploads/images/${req.file.filename}`;

    await prisma.template.update({
      where: { id: req.params.id },
      data: { previewImage: previewPath }
    });

    res.json({
      message: 'Image de prévisualisation mise à jour',
      previewImage: previewPath
    });
  } catch (error) {
    logger.error('Upload preview image error:', error);
    res.status(500).json({ error: "Erreur lors de l'upload" });
  }
});

/**
 * @route   POST /api/templates/:id/preview-images
 * @desc    Upload template preview images
 * @access  Private/Admin
 */
router.post('/:id/preview-images', authenticate, isAdmin, uploadMultiple('previewImages', 5), handleUploadError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucune image uploadée' });
    }

    const previewImages = req.files.map(file => `/uploads/images/${file.filename}`);

    // Get existing preview images
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
      select: { previewImages: true }
    });

    const existingImages = template?.previewImages || [];
    const allImages = [...existingImages, ...previewImages];

    await prisma.template.update({
      where: { id: req.params.id },
      data: { previewImages: allImages }
    });

    res.json({
      message: 'Images ajoutées',
      previewImages: allImages
    });
  } catch (error) {
    logger.error('Upload preview images error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

/**
 * @route   DELETE /api/templates/:id
 * @desc    Delete template (Admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
      select: { id: true, isCustom: true, userId: true }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    // Admins can delete any template; a creator/client can delete only their
    // own custom templates.
    const isAdminUser = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    const isOwner = template.isCustom && template.userId === req.user.id;
    if (!isAdminUser && !isOwner) {
      return res.status(403).json({ error: "Vous ne pouvez supprimer que vos propres templates" });
    }

    // A template used in one or more events cannot be removed (it would break
    // those invitations). Admins still soft-disable base templates instead.
    const weddingsUsingTemplate = await prisma.wedding.count({
      where: { templateId: req.params.id }
    });

    if (weddingsUsingTemplate > 0) {
      if (isAdminUser && !template.isCustom) {
        await prisma.template.update({
          where: { id: req.params.id },
          data: { isActive: false }
        });
        return res.json({ message: 'Template désactivé (utilisé par des événements existants)' });
      }
      return res.status(400).json({
        error: `Ce template est utilisé dans ${weddingsUsingTemplate} événement(s) et ne peut pas être supprimé.`
      });
    }

    // Deleting the template cascades its marketplace listing (and usage tracks).
    await prisma.template.delete({
      where: { id: req.params.id }
    });

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        entity: 'template',
        entityId: req.params.id
      }
    });

    res.json({ message: 'Template supprimé' });
  } catch (error) {
    logger.error('Delete template error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

/**
 * @route   POST /api/templates/:id/preview
 * @desc    Generate preview with sample data
 * @access  Public
 */
router.post('/:id/preview', async (req, res) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    // Sample data for preview
    const sampleData = {
      bride_name: req.body.brideName || 'Marie',
      groom_name: req.body.groomName || 'Jean',
      date: req.body.date || new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: req.body.time || '15:00',
      venue_name: req.body.venueName || 'Château de Versailles',
      venue_address: req.body.venueAddress || 'Place d\'Armes, 78000 Versailles',
      custom_message: req.body.customMessage || 'Nous serions honorés de votre présence',
      guest_name: 'Invité Test',
      table_number: 'VIP',
      qr_code: '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="QR Code" style="width:120px;height:120px"/>',
      rsvp_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')
    };

    // Replace variables in template
    let html = template.htmlContent;
    Object.entries(sampleData).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    // Replace CSS
    html = html.replace('{{css_content}}', template.cssContent || '');

    res.json({ 
      preview: html,
      template: {
        id: template.id,
        name: template.name
      }
    });
  } catch (error) {
    logger.error('Preview template error:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du preview' });
  }
});

module.exports = router;
