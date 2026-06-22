const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');
const { createNotification, NotificationTemplates } = require('../utils/notifications');
const { eventDisplayName } = require('../utils/helpers');

const prisma = new PrismaClient();

/**
 * @route   POST /api/checkin/scan
 * @desc    Process QR code scan for check-in
 * @access  Private (wedding owner or admin)
 */
router.post('/scan', authenticate, async (req, res) => {
  try {
    const { uniqueCode, deviceInfo, location } = req.body;

    // Find invitation by code
    const invitation = await prisma.invitation.findUnique({
      where: { uniqueCode },
      include: {
        guest: true,
        wedding: {
          include: {
            user: { select: { id: true } }
          }
        }
      }
    });

    if (!invitation) {
      return res.status(404).json({ 
        error: 'Code QR invalide',
        valid: false 
      });
    }

    // Verify permission (owner or admin)
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && invitation.wedding.user.id !== req.user.id) {
      return res.status(403).json({ error: 'AccÃ¨s non autorisÃ©' });
    }

    // Check if guest already checked in
    const existingCheckIn = await prisma.checkIn.findFirst({
      where: {
        guestId: invitation.guestId,
        weddingId: invitation.weddingId
      }
    });

    if (existingCheckIn) {
      return res.json({
        valid: true,
        alreadyCheckedIn: true,
        guest: {
          id: invitation.guest.id,
          firstName: invitation.guest.firstName,
          lastName: invitation.guest.lastName,
          tableNumber: invitation.guest.tableNumber,
          plusOnes: invitation.guest.plusOnes
        },
        checkIn: existingCheckIn,
        message: 'Cet invitÃ© est dÃ©jÃ  enregistrÃ©'
      });
    }

    // Create check-in
    const checkIn = await prisma.checkIn.create({
      data: {
        weddingId: invitation.weddingId,
        guestId: invitation.guestId,
        checkedInBy: req.user.id,
        deviceInfo,
        location,
        plusOnesPresent: invitation.guest.plusOnes
      }
    });

    // Update wedding confirmed guests count
    await prisma.wedding.update({
      where: { id: invitation.weddingId },
      data: {
        confirmedGuests: { increment: 1 + invitation.guest.plusOnes }
      }
    });

    // Log check-in
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'QR_SCAN',
        entity: 'checkin',
        entityId: checkIn.id,
        details: {
          guestId: invitation.guestId,
          guestName: `${invitation.guest.firstName} ${invitation.guest.lastName}`
        }
      }
    });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`wedding-${invitation.weddingId}`).emit('guest-checked-in', {
        weddingId: invitation.weddingId,
        guest: {
          id: invitation.guest.id,
          name: `${invitation.guest.firstName} ${invitation.guest.lastName}`,
          tableNumber: invitation.guest.tableNumber
        },
        checkIn
      });
    }

    // Notify wedding owner
    const checkinNotif = NotificationTemplates.guestCheckedIn(
      `${invitation.guest.firstName} ${invitation.guest.lastName}`,
      eventDisplayName(invitation.wedding)
    );
    createNotification({
      userId: invitation.wedding.user.id,
      ...checkinNotif,
      data: { link: `/weddings/${invitation.weddingId}/checkin`, weddingId: invitation.weddingId },
      io
    }).catch(err => logger.error('Check-in notification failed:', err));

    res.json({
      valid: true,
      alreadyCheckedIn: false,
      guest: {
        id: invitation.guest.id,
        firstName: invitation.guest.firstName,
        lastName: invitation.guest.lastName,
        tableNumber: invitation.guest.tableNumber,
        plusOnes: invitation.guest.plusOnes,
        rsvpStatus: invitation.guest.rsvpStatus
      },
      checkIn,
      message: 'Check-in rÃ©ussi!'
    });
  } catch (error) {
    logger.error('Check-in scan error:', error);
    res.status(500).json({ error: 'Erreur lors du check-in' });
  }
});

/**
 * @route   GET /api/checkin/:weddingId
 * @desc    Get all check-ins for a wedding
 * @access  Private
 */
router.get('/:weddingId', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;

    // Verify wedding ownership
    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    const checkIns = await prisma.checkIn.findMany({
      where: { weddingId },
      orderBy: { checkedInAt: 'desc' },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tableNumber: true,
            plusOnes: true
          }
        }
      }
    });

    // Calculate stats
    const totalCheckedIn = checkIns.length;
    const totalWithPlusOnes = checkIns.reduce((sum, c) => sum + 1 + c.plusOnesPresent, 0);

    res.json({
      checkIns,
      stats: {
        totalCheckedIn,
        totalWithPlusOnes
      }
    });
  } catch (error) {
    logger.error('Get check-ins error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/checkin/:weddingId/live
 * @desc    Get live check-in stats
 * @access  Private
 */
router.get('/:weddingId/live', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;

    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      },
      include: {
        guests: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tableNumber: true,
            plusOnes: true,
            rsvpStatus: true
          }
        },
        checkIns: {
          include: {
            guest: {
              select: { id: true, firstName: true, lastName: true, tableNumber: true }
            }
          },
          orderBy: { checkedInAt: 'desc' }
        }
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    const checkedInIds = new Set(wedding.checkIns.map(c => c.guestId));
    
    const stats = {
      totalGuests: wedding.guests.length,
      totalExpected: wedding.guests.reduce((sum, g) => sum + 1 + g.plusOnes, 0),
      confirmed: wedding.guests.filter(g => g.rsvpStatus === 'CONFIRMED').length,
      checkedIn: wedding.checkIns.length,
      checkedInWithPlusOnes: wedding.checkIns.reduce((sum, c) => sum + 1 + c.plusOnesPresent, 0),
      pending: wedding.guests.filter(g => !checkedInIds.has(g.id)).length
    };

    const recentCheckIns = wedding.checkIns.slice(0, 10).map(c => ({
      id: c.id,
      guest: {
        firstName: c.guest.firstName,
        lastName: c.guest.lastName,
        tableNumber: c.guest.tableNumber
      },
      checkedInAt: c.checkedInAt,
      plusOnesPresent: c.plusOnesPresent
    }));

    res.json({
      stats,
      recentCheckIns
    });
  } catch (error) {
    logger.error('Get live stats error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/checkin/:weddingId/manifest
 * @desc    Full guest + invitation list for offline check-in (mobile app download)
 * @access  Private
 */
router.get('/:weddingId/manifest', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;

    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      },
      include: {
        guests: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tableNumber: true,
            plusOnes: true,
            rsvpStatus: true,
            invitation: { select: { uniqueCode: true } }
          }
        },
        checkIns: {
          select: { guestId: true, checkedInAt: true, plusOnesPresent: true }
        }
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    const checkedInMap = new Map(wedding.checkIns.map(c => [c.guestId, c]));

    const guests = wedding.guests
      .filter(g => g.invitation?.uniqueCode)
      .map(g => ({
        guestId: g.id,
        uniqueCode: g.invitation.uniqueCode,
        firstName: g.firstName,
        lastName: g.lastName,
        tableNumber: g.tableNumber,
        plusOnes: g.plusOnes,
        invitationType: g.plusOnes > 0 ? 'Couple' : 'Singleton',
        rsvpStatus: g.rsvpStatus,
        checkedIn: checkedInMap.has(g.id),
        checkedInAt: checkedInMap.get(g.id)?.checkedInAt || null
      }));

    res.json({
      wedding: {
        id: wedding.id,
        brideName: wedding.brideName,
        groomName: wedding.groomName,
        weddingDate: wedding.weddingDate
      },
      guests,
      generatedAt: new Date()
    });
  } catch (error) {
    logger.error('Get check-in manifest error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/checkin/:weddingId/sync
 * @desc    Bulk-sync check-ins recorded offline by the mobile app
 * @access  Private
 */
router.post('/:weddingId/sync', authenticate, async (req, res) => {
  try {
    const { weddingId } = req.params;
    const scans = Array.isArray(req.body.scans) ? req.body.scans : [];

    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    const io = req.app.get('io');
    const results = [];

    for (const scan of scans) {
      const { uniqueCode, scannedAt, deviceId } = scan;

      const invitation = await prisma.invitation.findUnique({
        where: { uniqueCode },
        include: { guest: true }
      });

      if (!invitation || invitation.weddingId !== weddingId) {
        results.push({ uniqueCode, status: 'invalid' });
        continue;
      }

      const existing = await prisma.checkIn.findFirst({
        where: { guestId: invitation.guestId, weddingId }
      });

      if (existing) {
        results.push({ uniqueCode, status: 'duplicate', guestId: invitation.guestId });
        continue;
      }

      const checkIn = await prisma.checkIn.create({
        data: {
          weddingId,
          guestId: invitation.guestId,
          checkedInBy: req.user.id,
          deviceInfo: deviceId || 'mobile-offline-sync',
          plusOnesPresent: invitation.guest.plusOnes,
          checkedInAt: scannedAt ? new Date(scannedAt) : new Date()
        }
      });

      await prisma.wedding.update({
        where: { id: weddingId },
        data: { confirmedGuests: { increment: 1 + invitation.guest.plusOnes } }
      });

      if (io) {
        io.to(`wedding-${weddingId}`).emit('guest-checked-in', {
          weddingId,
          guest: {
            id: invitation.guest.id,
            name: `${invitation.guest.firstName} ${invitation.guest.lastName}`,
            tableNumber: invitation.guest.tableNumber
          },
          checkIn
        });
      }

      results.push({ uniqueCode, status: 'ok', guestId: invitation.guestId, checkInId: checkIn.id });
    }

    res.json({ results });
  } catch (error) {
    logger.error('Check-in sync error:', error);
    res.status(500).json({ error: 'Erreur lors de la synchronisation' });
  }
});

/**
 * @route   DELETE /api/checkin/:weddingId/:checkInId
 * @desc    Undo check-in
 * @access  Private
 */
router.delete('/:weddingId/:checkInId', authenticate, async (req, res) => {
  try {
    const { weddingId, checkInId } = req.params;

    // Verify wedding ownership
    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        ...(req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && { userId: req.user.id })
      }
    });

    if (!wedding) {
      return res.status(404).json({ error: 'Mariage non trouvÃ©' });
    }

    const checkIn = await prisma.checkIn.findUnique({
      where: { id: checkInId }
    });

    if (!checkIn) {
      return res.status(404).json({ error: 'Check-in non trouvÃ©' });
    }

    await prisma.checkIn.delete({
      where: { id: checkInId }
    });

    // Update wedding confirmed guests count
    await prisma.wedding.update({
      where: { id: weddingId },
      data: {
        confirmedGuests: { decrement: 1 + checkIn.plusOnesPresent }
      }
    });

    res.json({ message: 'Check-in annulÃ©' });
  } catch (error) {
    logger.error('Undo check-in error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
