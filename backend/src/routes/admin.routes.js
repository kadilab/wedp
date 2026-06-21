const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { paginationValidation } = require('../middleware/validation.middleware');
const { paginate, buildPaginationMeta } = require('../utils/helpers');
const logger = require('../utils/logger');
const { createNotification, NotificationTemplates } = require('../utils/notifications');
const { getTelegramConfig } = require('../utils/telegram');
const axios = require('axios');
const { generatePrintLayoutPDF, calculateImposition, PRINT_SIZES_MM } = require('../utils/pdf');
const { uploadSingle, handleUploadError } = require('../middleware/upload.middleware');

const prisma = new PrismaClient();

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard stats
 * @access  Private/Admin
 */
router.get('/dashboard', authenticate, isAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalWeddings,
      activeWeddings,
      pendingInvitationOrders,
      totalInvitations,
      totalCheckIns,
      totalGuests,
      totalPrintOrders,
      recentInvitationOrders,
      recentUsers,
      recentWeddings
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.wedding.count(),
      prisma.wedding.count({ where: { status: 'ACTIVE' } }),
      prisma.invitationOrder.count({ where: { status: 'PENDING' } }),
      prisma.invitation.count(),
      prisma.checkIn.count(),
      prisma.guest.count(),
      prisma.printOrder.count(),
      prisma.invitationOrder.findMany({
        take: 7,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          wedding: { select: { brideName: true, groomName: true } }
        }
      }),
      prisma.user.findMany({
        where: { role: 'CLIENT' },
        take: 7,
        orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, email: true, createdAt: true }
      }),
      prisma.wedding.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, brideName: true, groomName: true, weddingDate: true, status: true, createdAt: true,
          _count: { select: { guests: true, invitations: true } }
        }
      })
    ]);

    // Revenue stats — from approved invitation-quota orders (the active monetization flow)
    const revenue = await prisma.invitationOrder.aggregate({
      where: { status: 'APPROVED' },
      _sum: { totalAmount: true },
      _count: true
    });

    // RSVP breakdown
    const rsvpStats = await prisma.guest.groupBy({
      by: ['rsvpStatus'],
      _count: true
    });

    // Invitation order status breakdown
    const invitationOrderStatusStats = await prisma.invitationOrder.groupBy({
      by: ['status'],
      _count: true,
      _sum: { totalAmount: true }
    });

    // Monthly registrations & weddings (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [usersRaw, weddingsRaw, ordersRaw] = await Promise.all([
      prisma.$queryRaw`
        SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
        FROM users WHERE role = 'CLIENT' AND created_at >= ${sixMonthsAgo}
        GROUP BY month ORDER BY month`,
      prisma.$queryRaw`
        SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
        FROM weddings WHERE created_at >= ${sixMonthsAgo}
        GROUP BY month ORDER BY month`,
      prisma.$queryRaw`
        SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count,
               SUM(CASE WHEN status = 'APPROVED' THEN total_amount ELSE 0 END) as revenue
        FROM invitation_orders WHERE created_at >= ${sixMonthsAgo}
        GROUP BY month ORDER BY month`
    ]);

    // Build monthly chart data
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      const uRow = usersRaw.find(r => r.month === key);
      const wRow = weddingsRaw.find(r => r.month === key);
      const oRow = ordersRaw.find(r => r.month === key);
      monthlyData.push({
        month: label,
        users: Number(uRow?.count || 0),
        weddings: Number(wRow?.count || 0),
        orders: Number(oRow?.count || 0),
        revenue: Number(oRow?.revenue || 0)
      });
    }

    // Wedding status breakdown
    const weddingStatusStats = await prisma.wedding.groupBy({
      by: ['status'],
      _count: true
    });

    // Today stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [todayUsers, todayWeddings, todayOrders] = await Promise.all([
      prisma.user.count({ where: { role: 'CLIENT', createdAt: { gte: todayStart } } }),
      prisma.wedding.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.invitationOrder.count({ where: { createdAt: { gte: todayStart } } })
    ]);

    res.json({
      stats: {
        totalUsers,
        totalWeddings,
        activeWeddings,
        pendingInvitationOrders,
        totalInvitations,
        totalCheckIns,
        totalGuests,
        totalPrintOrders,
        totalRevenue: revenue._sum.totalAmount || 0,
        approvedOrders: revenue._count || 0,
        todayUsers,
        todayWeddings,
        todayOrders
      },
      rsvpStats: rsvpStats.map(r => ({ status: r.rsvpStatus, count: Number(r._count) })),
      invitationOrderStatusStats: invitationOrderStatusStats.map(r => ({
        status: r.status,
        count: Number(r._count),
        amount: Number(r._sum?.totalAmount || 0)
      })),
      weddingStatusStats: weddingStatusStats.map(r => ({ status: r.status, count: Number(r._count) })),
      monthlyData,
      recentInvitationOrders,
      recentUsers,
      recentWeddings
    });
  } catch (error) {
    logger.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private/Admin
 */
router.get('/users', authenticate, isAdmin, paginationValidation, async (req, res) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const { status, role, search } = req.query;

    const where = {
      ...(status && { status }),
      ...(role && { role }),
      ...(search && {
        OR: [
          { email: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } }
        ]
      })
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          _count: {
            select: { weddings: true }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: buildPaginationMeta(total, page, limit)
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get single user with weddings, invitations & print orders
 * @access  Private/Admin
 */
router.get('/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        weddings: {
          orderBy: { createdAt: 'desc' },
          include: {
            plan: { select: { name: true, type: true } },
            template: { select: { id: true, name: true, config: true, colorScheme: true } },
            guests: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                rsvpStatus: true,
                tableNumber: true,
                invitation: {
                  select: {
                    id: true,
                    uniqueCode: true,
                    qrCodeUrl: true,
                    pdfUrl: true,
                    imageUrl: true,
                    viewCount: true,
                    createdAt: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' }
            },
            invitations: {
              select: {
                id: true,
                uniqueCode: true,
                qrCodeUrl: true,
                pdfUrl: true,
                imageUrl: true,
                viewCount: true,
                guest: {
                  select: { firstName: true, lastName: true, email: true, rsvpStatus: true }
                },
                createdAt: true
              },
              orderBy: { createdAt: 'desc' }
            },
            printOrders: {
              select: {
                id: true,
                quantity: true,
                paperType: true,
                finish: true,
                size: true,
                price: true,
                status: true,
                createdAt: true
              },
              orderBy: { createdAt: 'desc' }
            },
            _count: {
              select: { guests: true, invitations: true, checkIns: true }
            }
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: {
            wedding: { select: { brideName: true, groomName: true } }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get user detail error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user details
 * @access  Private/Admin
 */
router.put('/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role, status } = req.body;

    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Only SUPER_ADMIN can modify ADMIN/SUPER_ADMIN users
    if ((targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN') && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Permission insuffisante' });
    }

    // Only SUPER_ADMIN can assign SUPER_ADMIN role
    if (role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Seul un Super Admin peut attribuer ce rôle' });
    }

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role && ['CLIENT', 'ADMIN', 'SUPER_ADMIN'].includes(role)) updateData.role = role;
    if (status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) updateData.status = status;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true
      }
    });

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'user',
        entityId: req.params.id,
        details: { updatedFields: Object.keys(updateData) }
      }
    });

    res.json({
      message: 'Utilisateur mis à jour',
      user
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Update user status
 * @access  Private/Admin
 */
router.put('/users/:id/status', authenticate, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true
      }
    });

    // Log action
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'user',
        entityId: req.params.id,
        details: { newStatus: status }
      }
    });

    res.json({
      message: `Statut de l'utilisateur mis à jour: ${status}`,
      user
    });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update user role (SUPER_ADMIN only can assign SUPER_ADMIN)
 * @access  Private/Admin
 */
router.put('/users/:id/role', authenticate, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['CLIENT', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    // Only SUPER_ADMIN can assign SUPER_ADMIN role
    if (role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Seul un Super Admin peut attribuer ce rôle' });
    }

    // Prevent removing own SUPER_ADMIN role
    if (req.params.id === req.user.id && req.user.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Vous ne pouvez pas retirer votre propre rôle Super Admin' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    // Log action
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'user',
        entityId: req.params.id,
        details: { newRole: role }
      }
    });

    res.json({
      message: `Rôle de l'utilisateur mis à jour: ${role}`,
      user
    });
  } catch (error) {
    logger.error('Update user role error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user and all associated data
 * @access  Private/Admin
 */
router.delete('/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Prevent deleting yourself
    if (targetUser.id === req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    // Only SUPER_ADMIN can delete ADMIN/SUPER_ADMIN
    if ((targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN') && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Permission insuffisante' });
    }

    await prisma.user.delete({ where: { id: req.params.id } });

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        entity: 'user',
        entityId: req.params.id,
        details: { email: targetUser.email, name: `${targetUser.firstName} ${targetUser.lastName}` }
      }
    });

    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/admin/weddings
 * @desc    Get all weddings
 * @access  Private/Admin
 */
router.get('/weddings', authenticate, isAdmin, paginationValidation, async (req, res) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const { status, search } = req.query;

    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { brideName: { contains: search } },
          { groomName: { contains: search } },
          { eventTitle: { contains: search } },
          { slug: { contains: search } }
        ]
      })
    };

    const [weddings, total] = await Promise.all([
      prisma.wedding.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          plan: {
            select: { name: true, type: true }
          },
          _count: {
            select: { guests: true, invitations: true, checkIns: true }
          }
        }
      }),
      prisma.wedding.count({ where })
    ]);

    res.json({
      weddings,
      pagination: buildPaginationMeta(total, page, limit)
    });
  } catch (error) {
    logger.error('Get weddings error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/admin/weddings/:id/activate
 * @desc    Manually activate a wedding
 * @access  Private/Admin
 */
router.put('/weddings/:id/activate', authenticate, isAdmin, async (req, res) => {
  try {
    const wedding = await prisma.wedding.update({
      where: { id: req.params.id },
      data: {
        status: 'ACTIVE',
        isPublished: true,
        publishedAt: new Date()
      }
    });

    // Log activation
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'ACTIVATION',
        entity: 'wedding',
        entityId: req.params.id,
        details: { manual: true }
      }
    });

    res.json({
      message: 'Mariage activé manuellement',
      wedding
    });
  } catch (error) {
    logger.error('Activate wedding error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   DELETE /api/admin/weddings/:id
 * @desc    Delete a wedding (admin)
 * @access  Private/Admin
 */
router.delete('/weddings/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { id: req.params.id },
      select: { id: true, brideName: true, groomName: true }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvé' });
    }

    await prisma.wedding.delete({ where: { id: req.params.id } });

    // Log deletion
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        entity: 'wedding',
        entityId: req.params.id,
        details: { brideName: wedding.brideName, groomName: wedding.groomName }
      }
    });

    res.json({ message: 'Mariage supprimé avec succès' });
  } catch (error) {
    logger.error('Delete wedding error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/admin/logs
 * @desc    Get system logs
 * @access  Private/Admin
 */
router.get('/logs', authenticate, isAdmin, paginationValidation, async (req, res) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const { action, entity, userId } = req.query;

    const where = {
      ...(action && { action }),
      ...(entity && { entity }),
      ...(userId && { userId })
    };

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      }),
      prisma.log.count({ where })
    ]);

    res.json({
      logs,
      pagination: buildPaginationMeta(total, page, limit)
    });
  } catch (error) {
    logger.error('Get logs error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/admin/notifications/send
 * @desc    Send notification to users
 * @access  Private/Admin
 */
router.post('/notifications/send', authenticate, isAdmin, async (req, res) => {
  try {
    const { userIds, type, title, message, data } = req.body;

    if (!userIds || userIds.length === 0) {
      return res.status(400).json({ error: 'Aucun utilisateur sélectionné' });
    }

    const notifications = await prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type: type || 'general',
        title,
        message,
        data: data || null
      }))
    });

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      userIds.forEach(userId => {
        io.to(`user:${userId}`).emit('notification', { title, message });
      });
    }

    res.json({
      message: `${notifications.count} notifications envoyées`,
      count: notifications.count
    });
  } catch (error) {
    logger.error('Send notifications error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/admin/analytics
 * @desc    Get detailed analytics
 * @access  Private/Admin
 */
router.get('/analytics', authenticate, isAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '7d': startDate.setDate(startDate.getDate() - 7); break;
      case '30d': startDate.setDate(startDate.getDate() - 30); break;
      case '90d': startDate.setDate(startDate.getDate() - 90); break;
      case '1y': startDate.setFullYear(startDate.getFullYear() - 1); break;
      default: startDate.setDate(startDate.getDate() - 30);
    }

    const [
      newUsers,
      newWeddings,
      totalRevenue,
      invitationsGenerated,
      checkIns,
      rsvpStats
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      prisma.wedding.count({ where: { createdAt: { gte: startDate } } }),
      prisma.payment.aggregate({
        where: { status: 'APPROVED', createdAt: { gte: startDate } },
        _sum: { amount: true }
      }),
      prisma.invitation.count({ where: { createdAt: { gte: startDate } } }),
      prisma.checkIn.count({ where: { checkedInAt: { gte: startDate } } }),
      prisma.guest.groupBy({
        by: ['rsvpStatus'],
        _count: true
      })
    ]);

    // Plan distribution
    const planDistribution = await prisma.wedding.groupBy({
      by: ['planId'],
      _count: true
    });

    res.json({
      period,
      analytics: {
        newUsers,
        newWeddings,
        totalRevenue: totalRevenue._sum.amount || 0,
        invitationsGenerated,
        checkIns,
        rsvpStats: Object.fromEntries(rsvpStats.map(s => [s.rsvpStatus, s._count])),
        planDistribution
      }
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/admin/payments
 * @desc    Get all payments
 * @access  Private/Admin
 */
router.get('/payments', authenticate, isAdmin, paginationValidation, async (req, res) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const { status, search } = req.query;

    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { reference: { contains: search } },
          { user: { email: { contains: search } } },
          { user: { firstName: { contains: search } } },
          { user: { lastName: { contains: search } } }
        ]
      })
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          wedding: {
            select: { id: true, brideName: true, groomName: true, slug: true, plan: { select: { id: true, name: true, type: true, price: true } } }
          }
        }
      }),
      prisma.payment.count({ where })
    ]);

    res.json({
      payments,
      pagination: buildPaginationMeta(total, page, limit)
    });
  } catch (error) {
    logger.error('Get payments error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/admin/payments/:id/approve
 * @desc    Approve a payment
 * @access  Private/Admin
 */
router.put('/payments/:id/approve', authenticate, isAdmin, async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { wedding: { include: { plan: true } }, user: true }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    if (payment.status === 'APPROVED') {
      return res.status(400).json({ error: 'Ce paiement est déjà approuvé' });
    }

    // Update payment
    const updatedPayment = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        processedAt: new Date(),
        processedBy: req.user.id
      }
    });

    // Activate wedding if exists
    if (payment.weddingId) {
      await prisma.wedding.update({
        where: { id: payment.weddingId },
        data: {
          status: 'ACTIVE',
          isPublished: true,
          publishedAt: new Date()
        }
      });
    }

    // Log action
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'PAYMENT',
        entity: 'payment',
        entityId: req.params.id,
        details: { status: 'APPROVED', amount: payment.amount, reference: payment.reference }
      }
    });

    // Send notification to user
    const approveNotif = NotificationTemplates.paymentApproved(payment.wedding?.plan?.name || 'Premium');
    createNotification({
      userId: payment.userId,
      ...approveNotif,
      data: { link: '/payments', paymentId: payment.id },
      io: req.app.get('io')
    }).catch(err => logger.error('Payment approve notification failed:', err));

    res.json({
      message: 'Paiement approuvé avec succès',
      payment: updatedPayment
    });
  } catch (error) {
    logger.error('Approve payment error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/admin/payments/:id/reject
 * @desc    Reject a payment
 * @access  Private/Admin
 */
router.put('/payments/:id/reject', authenticate, isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    if (payment.status !== 'PENDING') {
      return res.status(400).json({ error: 'Ce paiement ne peut plus être rejeté' });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        processedAt: new Date(),
        processedBy: req.user.id,
        adminNote: reason
      }
    });

    // Log action
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'PAYMENT',
        entity: 'payment',
        entityId: req.params.id,
        details: { status: 'REJECTED', reason }
      }
    });

    // Send notification to user
    const rejectNotif = NotificationTemplates.paymentRejected(reason);
    createNotification({
      userId: payment.userId,
      ...rejectNotif,
      data: { link: '/payments', paymentId: payment.id },
      io: req.app.get('io')
    }).catch(err => logger.error('Payment reject notification failed:', err));

    res.json({
      message: 'Paiement rejeté',
      payment: updatedPayment
    });
  } catch (error) {
    logger.error('Reject payment error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== INVITATION ORDERS ====================

/**
 * @route   GET /api/admin/invitation-orders
 * @desc    List invitation quota orders (manual mobile-money purchases)
 * @access  Private/Admin
 */
router.get('/invitation-orders', authenticate, isAdmin, paginationValidation, async (req, res) => {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const { status, search } = req.query;

    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { transactionId: { contains: search } },
          { user: { email: { contains: search } } },
          { user: { firstName: { contains: search } } },
          { user: { lastName: { contains: search } } }
        ]
      })
    };

    const [orders, total] = await Promise.all([
      prisma.invitationOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          wedding: {
            select: { id: true, brideName: true, groomName: true, slug: true }
          }
        }
      }),
      prisma.invitationOrder.count({ where })
    ]);

    res.json({
      orders,
      pagination: buildPaginationMeta(total, page, limit)
    });
  } catch (error) {
    logger.error('Get invitation orders error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/admin/invitation-orders/:id/approve
 * @desc    Approve an invitation quota order (credits the wedding's quota)
 * @access  Private/Admin
 */
router.put('/invitation-orders/:id/approve', authenticate, isAdmin, async (req, res) => {
  try {
    const order = await prisma.invitationOrder.findUnique({
      where: { id: req.params.id },
      include: { wedding: true, user: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cette commande a déjà été traitée' });
    }

    const updatedOrder = await prisma.invitationOrder.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        processedAt: new Date(),
        processedBy: req.user.id
      }
    });

    // No side effect on the wedding itself (unlike plan payments) — quota is derived
    // automatically from approved orders by getWeddingQuota().

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'PAYMENT',
        entity: 'invitation_order',
        entityId: req.params.id,
        details: { status: 'APPROVED', quantity: order.quantity, totalAmount: order.totalAmount }
      }
    });

    const approveNotif = NotificationTemplates.invitationOrderApproved(order.quantity);
    createNotification({
      userId: order.userId,
      ...approveNotif,
      data: { link: `/weddings/${order.weddingId}/invitations`, orderId: order.id },
      io: req.app.get('io')
    }).catch(err => logger.error('Invitation order approve notification failed:', err));

    res.json({
      message: 'Commande approuvée avec succès',
      order: updatedOrder
    });
  } catch (error) {
    logger.error('Approve invitation order error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/admin/invitation-orders/:id/reject
 * @desc    Reject an invitation quota order
 * @access  Private/Admin
 */
router.put('/invitation-orders/:id/reject', authenticate, isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await prisma.invitationOrder.findUnique({
      where: { id: req.params.id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cette commande ne peut plus être rejetée' });
    }

    const updatedOrder = await prisma.invitationOrder.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        processedAt: new Date(),
        processedBy: req.user.id,
        adminNote: reason
      }
    });

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'PAYMENT',
        entity: 'invitation_order',
        entityId: req.params.id,
        details: { status: 'REJECTED', reason }
      }
    });

    const rejectNotif = NotificationTemplates.invitationOrderRejected(reason);
    createNotification({
      userId: order.userId,
      ...rejectNotif,
      data: { link: `/weddings/${order.weddingId}/invitations`, orderId: order.id },
      io: req.app.get('io')
    }).catch(err => logger.error('Invitation order reject notification failed:', err));

    res.json({
      message: 'Commande rejetée',
      order: updatedOrder
    });
  } catch (error) {
    logger.error('Reject invitation order error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== SETTINGS ====================

// Get all settings
router.get('/settings', authenticate, isAdmin, async (req, res) => {
  try {
    const settingsRecords = await prisma.setting.findMany();
    
    // Convert array of key-value pairs to object
    const settings = {};
    settingsRecords.forEach(s => {
      try {
        settings[s.key] = s.type === 'json' ? JSON.parse(s.value) : s.value;
      } catch {
        settings[s.key] = s.value;
      }
    });

    res.json({ settings });
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update settings
router.put('/settings', authenticate, isAdmin, async (req, res) => {
  try {
    const updates = req.body;
    
    // Update each setting
    for (const [key, value] of Object.entries(updates)) {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const type = typeof value === 'object' ? 'json' : typeof value;
      
      await prisma.setting.upsert({
        where: { key },
        update: { value: stringValue, type },
        create: { key, value: stringValue, type }
      });
    }

    // Log action
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'settings',
        entityId: 'global',
        details: { message: 'Mise à jour des paramètres' },
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Paramètres mis à jour' });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Send a test Telegram message. Uses the token/chatId from the request body if
// provided (so the admin can test before saving), otherwise falls back to the
// currently saved settings.
router.post('/settings/test-telegram', authenticate, isAdmin, async (req, res) => {
  try {
    const saved = await getTelegramConfig();
    const botToken = req.body.botToken || saved.botToken;
    const chatId = req.body.chatId || saved.chatId;

    if (!botToken || !chatId) {
      return res.status(400).json({ error: 'Bot Token et Chat ID requis avant de tester' });
    }

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: '🔔 Test de notification Telegram depuis WeddingInvite Pro. Tout fonctionne !'
    });

    res.json({ message: 'Message de test envoyé. Vérifiez votre Telegram.' });
  } catch (error) {
    logger.error('Test Telegram error:', error.response?.data || error.message);
    res.status(400).json({ error: error.response?.data?.description || 'Échec de l\'envoi. Vérifiez le Token et le Chat ID.' });
  }
});

// Upload site logo
router.post('/settings/logo', authenticate, isAdmin, uploadSingle('logo'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier envoyé' });
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;

    await prisma.setting.upsert({
      where: { key: 'siteLogo' },
      update: { value: logoUrl, type: 'string' },
      create: { key: 'siteLogo', value: logoUrl, type: 'string' }
    });

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'settings',
        entityId: 'siteLogo',
        details: { message: 'Logo du site mis à jour', logoUrl },
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Logo mis à jour', logoUrl });
  } catch (error) {
    logger.error('Upload site logo error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete site logo
router.delete('/settings/logo', authenticate, isAdmin, async (req, res) => {
  try {
    await prisma.setting.upsert({
      where: { key: 'siteLogo' },
      update: { value: '', type: 'string' },
      create: { key: 'siteLogo', value: '', type: 'string' }
    });

    res.json({ message: 'Logo supprimé' });
  } catch (error) {
    logger.error('Delete site logo error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== PRINT ORDERS ====================

/**
 * @route   GET /api/admin/print-orders
 * @desc    Get all print orders (admin)
 * @access  Private/Admin
 */
router.get('/print-orders', authenticate, isAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    const where = status ? { status } : {};
    
    const orders = await prisma.printOrder.findMany({
      where,
      include: {
        wedding: {
          select: {
            id: true, brideName: true, groomName: true, slug: true, templateId: true,
            template: { select: { id: true, name: true, category: true, config: true } }
          }
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        }
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.printOrder.count({ where });

    res.json({ 
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Admin get print orders error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/admin/print-orders/:id
 * @desc    Get single print order (admin)
 * @access  Private/Admin
 */
router.get('/print-orders/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const order = await prisma.printOrder.findUnique({
      where: { id: req.params.id },
      include: {
        wedding: {
          select: { 
            id: true, 
            brideName: true, 
            groomName: true, 
            slug: true,
            template: { select: { name: true, thumbnail: true } }
          }
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    res.json({ order });
  } catch (error) {
    logger.error('Admin get print order error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/admin/print-orders/:id/status
 * @desc    Update print order status (admin)
 * @access  Private/Admin
 */
router.put('/print-orders/:id/status', authenticate, isAdmin, async (req, res) => {
  try {
    const { status, trackingNumber, estimatedDelivery } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PRINTING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const order = await prisma.printOrder.findUnique({
      where: { id: req.params.id },
      include: { user: true, wedding: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const updateData = { status };
    
    if (status === 'CONFIRMED') updateData.processedAt = new Date();
    if (status === 'SHIPPED') {
      updateData.shippedAt = new Date();
      if (trackingNumber) updateData.trackingNumber = trackingNumber;
    }
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery);

    const updatedOrder = await prisma.printOrder.update({
      where: { id: req.params.id },
      data: updateData
    });

    // Create notification for user
    const statusLabels = {
      CONFIRMED: 'confirmée',
      PRINTING: 'en cours d\'impression',
      SHIPPED: 'expédiée',
      DELIVERED: 'livrée',
      CANCELLED: 'annulée'
    };

    if (statusLabels[status]) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          type: 'PRINT_ORDER_UPDATE',
          title: 'Commande d\'impression mise à jour',
          message: `Votre commande d\'impression pour "${order.wedding.brideName} & ${order.wedding.groomName}" est ${statusLabels[status]}${trackingNumber ? `. Numéro de suivi: ${trackingNumber}` : ''}.`,
          data: { orderId: order.id, status, trackingNumber }
        }
      });
    }

    // Log action
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'print_order',
        entityId: order.id,
        details: { status, previousStatus: order.status },
        ipAddress: req.ip
      }
    });

    res.json({ message: `Statut mis à jour: ${status}`, order: updatedOrder });
  } catch (error) {
    logger.error('Admin update print order status error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/admin/print-layout/info
 * @desc    Get imposition info for a print size
 * @access  Private/Admin
 */
router.get('/print-layout/info', authenticate, isAdmin, (req, res) => {
  const { size } = req.query;
  const allSizes = {};
  for (const [key, dims] of Object.entries(PRINT_SIZES_MM)) {
    allSizes[key] = {
      ...dims,
      ...calculateImposition(key, null)
    };
  }
  if (size && PRINT_SIZES_MM[size]) {
    return res.json({ size, ...PRINT_SIZES_MM[size], ...calculateImposition(size, null) });
  }
  res.json({ sizes: allSizes });
});

/**
 * @route   POST /api/admin/print-layout/generate
 * @desc    Generate print-ready imposition PDF for a print order
 * @access  Private/Admin
 */
router.post('/print-layout/generate', authenticate, isAdmin, async (req, res) => {
  try {
    const { orderId, printSize } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'ID de commande requis' });
    }

    const order = await prisma.printOrder.findUnique({
      where: { id: orderId },
      include: {
        wedding: {
          include: {
            template: true,
            guests: {
              include: { invitation: true },
              where: { invitation: { isNot: null } }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const wedding = order.wedding;
    const template = wedding.template;
    const templateConfig = template?.config || {};
    const hasDesignElements = Array.isArray(templateConfig.designElements) && templateConfig.designElements.length > 0;
    const size = printSize || order.size || 'A6';
    const imposition = calculateImposition(size, hasDesignElements ? templateConfig : null);

    if (wedding.guests.length === 0) {
      return res.status(400).json({ error: 'Aucun invité avec invitation trouvé' });
    }

    // Include template format info in logs
    const canvasInfo = hasDesignElements
      ? ` (canvas: ${templateConfig.canvasWidth || 800}×${templateConfig.canvasHeight || 1120}px)`
      : ' (legacy layout)';
    logger.info(`Generating print layout PDF for order ${orderId}: ${size} (${imposition.perPage} per page)${canvasInfo}`);

    const pdfPath = await generatePrintLayoutPDF({
      wedding,
      guests: wedding.guests,
      template,
      printSize: size
    });

    // Update order with print layout path
    await prisma.printOrder.update({
      where: { id: orderId },
      data: { notes: `${order.notes || ''}\n[PDF prêt à imprimer: ${pdfPath}]`.trim() }
    });

    res.json({
      message: 'PDF prêt à imprimer généré',
      pdfUrl: pdfPath,
      imposition: {
        size,
        perPage: imposition.perPage,
        cols: imposition.cols,
        rows: imposition.rows,
        cardWidth: imposition.cardWidth,
        cardHeight: imposition.cardHeight,
        totalPages: Math.ceil(wedding.guests.length / imposition.perPage),
        totalInvitations: wedding.guests.length,
        templateFormat: hasDesignElements ? (templateConfig.selectedFormat || 'custom') : 'legacy',
        canvasWidth: templateConfig.canvasWidth || null,
        canvasHeight: templateConfig.canvasHeight || null
      }
    });
  } catch (error) {
    logger.error('Print layout generation error:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

module.exports = router;
