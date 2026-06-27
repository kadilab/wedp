const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        preferredLanguage: true,
        darkMode: true,
        isCreator: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    logger.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true
      }
    });

    if (user && user.status === 'ACTIVE') {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Silently continue without user
    next();
  }
};

/**
 * Check if user is admin or super admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

/**
 * Check if user is super admin only
 */
const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super Admin access required' });
  }

  next();
};

/**
 * Check if user is client
 */
const isClient = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'CLIENT' && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Client access required' });
  }

  next();
};

/**
 * Check if user is a creator
 */
const isCreator = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isCreator: true }
    });

    if (!user || !user.isCreator) {
      return res.status(403).json({ error: 'Creator access required. Please create a creator profile first.' });
    }

    next();
  } catch (error) {
    logger.error('Creator check error:', error);
    return res.status(500).json({ error: 'Authorization check failed' });
  }
};

/**
 * Check resource ownership
 */
const isOwner = (resourceField = 'userId') => {
  return async (req, res, next) => {
    const resourceId = req.params.id;
    
    if (!resourceId) {
      return next();
    }

    // Admins and Super Admins can access everything
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Check ownership based on the route
    try {
      let isOwnerOfResource = false;

      // Check wedding ownership
      if (req.baseUrl.includes('weddings') || req.baseUrl.includes('guests')) {
        const wedding = await prisma.wedding.findFirst({
          where: {
            OR: [
              { id: resourceId },
              { guests: { some: { id: resourceId } } }
            ]
          },
          select: { userId: true }
        });
        isOwnerOfResource = wedding?.userId === req.user.id;
      }

      if (!isOwnerOfResource) {
        return res.status(403).json({ error: 'Access denied' });
      }

      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  isAdmin,
  isSuperAdmin,
  isClient,
  isCreator,
  isOwner
};
