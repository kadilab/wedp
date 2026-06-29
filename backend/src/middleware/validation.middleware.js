const { body, param, query, validationResult } = require('express-validator');
const {
  EVENT_TYPES,
  eventUsesCouple,
  eventUsesHonoree,
  eventUsesFreeTitle
} = require('../utils/eventTypes');

// Validation result handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// Auth validations
const registerValidation = [
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/(?=.*[a-z])/).withMessage('Le mot de passe doit contenir au moins une minuscule')
    .matches(/(?=.*[A-Z])/).withMessage('Le mot de passe doit contenir au moins une majuscule')
    .matches(/(?=.*\d)/).withMessage('Le mot de passe doit contenir au moins un chiffre'),
  body('firstName')
    .trim()
    .notEmpty().withMessage('Le prénom est requis')
    .isLength({ max: 50 }).withMessage('Le prénom ne doit pas dépasser 50 caractères'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ max: 50 }).withMessage('Le nom ne doit pas dépasser 50 caractères'),
  body('phone')
    .optional()
    .isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
  validate
];

const loginValidation = [
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Le mot de passe est requis'),
  validate
];

// Conditional predicates per event type (shared taxonomy in utils/eventTypes.js)
const usesCouple = (value, { req }) => eventUsesCouple(req.body.eventType);
const usesHonoree = (value, { req }) => eventUsesHonoree(req.body.eventType);
const usesFreeTitle = (value, { req }) => eventUsesFreeTitle(req.body.eventType);

// Wedding validations
const createWeddingValidation = [
  body('eventType')
    .optional({ nullable: true })
    .isIn(EVENT_TYPES).withMessage('Type d\'événement invalide'),
  body('eventTitle')
    .if(usesFreeTitle)
    .trim()
    .notEmpty().withMessage('Le titre de l\'événement est requis')
    .isLength({ max: 150 }).withMessage('Le titre ne doit pas dépasser 150 caractères'),
  body('honoreeName')
    .if(usesHonoree)
    .trim()
    .notEmpty().withMessage('Le nom de la personne à l\'honneur est requis')
    .isLength({ max: 100 }).withMessage('Le nom ne doit pas dépasser 100 caractères'),
  body('brideName')
    .if(usesCouple)
    .trim()
    .notEmpty().withMessage('Le nom de la mariée est requis')
    .isLength({ max: 100 }).withMessage('Le nom ne doit pas dépasser 100 caractères'),
  body('groomName')
    .if(usesCouple)
    .trim()
    .notEmpty().withMessage('Le nom du marié est requis')
    .isLength({ max: 100 }).withMessage('Le nom ne doit pas dépasser 100 caractères'),
  body('weddingDate')
    .isISO8601().withMessage('Date de mariage invalide'),
  body('ceremonyTime')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Format d\'heure invalide (HH:MM)'),
  body('venueName')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 }).withMessage('Le nom du lieu ne doit pas dépasser 200 caractères'),
  body('venueAddress')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('L\'adresse ne doit pas dépasser 500 caractères'),
  body('templateId')
    .optional({ nullable: true })
    .isUUID().withMessage('ID de template invalide'),
  body('planId')
    .optional({ nullable: true })
    .isUUID().withMessage('ID de plan invalide'),
  // Programme - all optional
  body('communeDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Date de mairie invalide'),
  body('communeTime')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Format d\'heure invalide (HH:MM)'),
  body('communeVenue')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 }).withMessage('Le nom ne doit pas dépasser 200 caractères'),
  body('communeAddress')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('L\'adresse ne doit pas dépasser 500 caractères'),
  body('egliseDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Date de cérémonie religieuse invalide'),
  body('egliseTime')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Format d\'heure invalide (HH:MM)'),
  body('egliseVenue')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 }).withMessage('Le nom ne doit pas dépasser 200 caractères'),
  body('egliseAddress')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('L\'adresse ne doit pas dépasser 500 caractères'),
  body('receptionDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Date de réception invalide'),
  body('receptionStartTime')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Format d\'heure invalide (HH:MM)'),
  body('receptionVenue')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 }).withMessage('Le nom ne doit pas dépasser 200 caractères'),
  body('receptionAddress')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('L\'adresse ne doit pas dépasser 500 caractères'),
  validate
];

const updateWeddingValidation = [
  body('eventType')
    .optional({ nullable: true })
    .isIn(EVENT_TYPES).withMessage('Type d\'événement invalide'),
  body('eventTitle')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 }).withMessage('Le titre ne doit pas dépasser 150 caractères'),
  body('honoreeName')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Le nom ne doit pas dépasser 100 caractères'),
  body('brideName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Le nom ne doit pas dépasser 100 caractères'),
  body('groomName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Le nom ne doit pas dépasser 100 caractères'),
  body('weddingDate')
    .optional()
    .isISO8601().withMessage('Date de mariage invalide'),
  body('primaryColor')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Couleur invalide'),
  body('secondaryColor')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Couleur invalide'),
  validate
];

// Guest validations
const createGuestValidation = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('Le prénom est requis')
    .isLength({ max: 50 }).withMessage('Le prénom ne doit pas dépasser 50 caractères'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ max: 50 }).withMessage('Le nom ne doit pas dépasser 50 caractères'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('phone')
    .optional({ checkFalsy: true })
    .isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
  body('tableNumber')
    .optional({ checkFalsy: true })
    .isLength({ max: 50 }).withMessage('Le nom de table ne doit pas dépasser 50 caractères'),
  body('plusOnes')
    .optional()
    .isInt({ min: 0, max: 10 }).withMessage('Nombre d\'accompagnants invalide'),
  validate
];

// Payment validations
const requestPaymentValidation = [
  body('weddingId')
    .isUUID().withMessage('ID de mariage invalide'),
  body('amount')
    .isFloat({ min: 0 }).withMessage('Montant invalide'),
  body('couponCode')
    .optional()
    .isLength({ min: 3, max: 50 }).withMessage('Code coupon invalide'),
  validate
];

// Template validations
const createTemplateValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ max: 100 }).withMessage('Le nom ne doit pas dépasser 100 caractères'),
  body('htmlContent')
    .optional(),
  body('category')
    .optional()
    .isIn(['ELEGANT', 'MODERN', 'TRADITIONAL', 'ROMANTIC', 'MINIMALIST', 'classic', 'modern', 'romantic', 'rustic', 'minimalist', 'luxury'])
    .withMessage('Catégorie invalide'),
  body('isPremium')
    .optional()
    .isBoolean().withMessage('isPremium doit être un booléen'),
  body('config')
    .optional()
    .isObject().withMessage('Config doit être un objet'),
  validate
];

// Coupon validations
const createCouponValidation = [
  body('code')
    .trim()
    .notEmpty().withMessage('Le code est requis')
    .isLength({ min: 3, max: 50 }).withMessage('Le code doit contenir entre 3 et 50 caractères')
    .toUpperCase(),
  body('discountType')
    .isIn(['percentage', 'fixed']).withMessage('Type de réduction invalide'),
  body('discountValue')
    .isFloat({ min: 0 }).withMessage('Valeur de réduction invalide'),
  body('maxUses')
    .optional()
    .isInt({ min: 1 }).withMessage('Nombre d\'utilisations invalide'),
  body('validUntil')
    .optional()
    .isISO8601().withMessage('Date de validité invalide'),
  validate
];

// Pagination
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page invalide'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limite invalide'),
  validate
];

// UUID param
const uuidParamValidation = [
  param('id').isUUID().withMessage('ID invalide'),
  validate
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  createWeddingValidation,
  updateWeddingValidation,
  createGuestValidation,
  requestPaymentValidation,
  createTemplateValidation,
  createCouponValidation,
  paginationValidation,
  uuidParamValidation
};
