require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const { PrismaClient } = require('@prisma/client');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const weddingRoutes = require('./routes/wedding.routes');
const guestRoutes = require('./routes/guest.routes');
const invitationRoutes = require('./routes/invitation.routes');
const templateRoutes = require('./routes/template.routes');
const paymentRoutes = require('./routes/payment.routes');
const invitationOrderRoutes = require('./routes/invitationOrder.routes');
const adminRoutes = require('./routes/admin.routes');
const planRoutes = require('./routes/plan.routes');
const couponRoutes = require('./routes/coupon.routes');
const checkInRoutes = require('./routes/checkin.routes');
const publicRoutes = require('./routes/public.routes');
const backgroundRoutes = require('./routes/background.routes');
const printOrderRoutes = require('./routes/printOrder.routes');
const creatorRoutes = require('./routes/creator.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);

// Socket.IO for real-time features
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Make io available in routes
app.set('io', io);
app.set('prisma', prisma);

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language']
}));

// Rate limiting — generous for a SPA (react-query refetch + notification
// polling). Effectively disabled in development to avoid 429s while working.
const isProd = process.env.NODE_ENV === 'production';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 2000 : 100000, // per IP per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 login attempts per hour
  message: { error: 'Too many login attempts, please try again later.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing — keep the raw body around so webhook signatures (K-PAY) can be
// verified against the exact bytes received.
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
}

// Static files
// Generated invitations (PDF/PNG) REUSE a stable filename (invitation_<code>)
// and are overwritten on every regeneration, so they must NOT be cached as
// immutable — otherwise the browser keeps serving the old file. Serve these
// with revalidation BEFORE the general /uploads handler.
const NO_CACHE_OPTIONS = {
  etag: true,
  lastModified: true,
  setHeaders: (res) => { res.setHeader('Cache-Control', 'no-cache, must-revalidate'); }
};
app.use('/uploads/pdfs', express.static(path.join(__dirname, '../uploads/pdfs'), NO_CACHE_OPTIONS));
app.use('/uploads/images', express.static(path.join(__dirname, '../uploads/images'), NO_CACHE_OPTIONS));

// Everything else under /uploads gets a fresh UUID filename on every upload
// (never reused/overwritten), so it's safe to cache aggressively - avoids
// re-downloading the same avatar/background/etc. on every page load.
const UPLOADS_CACHE_OPTIONS = { maxAge: '7d', immutable: true };
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), UPLOADS_CACHE_OPTIONS));
app.use('/templates', express.static(path.join(__dirname, '../templates')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public visit tracking (no auth) — called once per session by the public site.
app.post('/api/public/track-visit', async (req, res) => {
  try {
    const { recordVisit } = require('./utils/supervision');
    await recordVisit();
  } catch { /* non-blocking */ }
  res.json({ ok: true });
});

// Public settings (no auth)
app.get('/api/settings/public', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const records = await prisma.setting.findMany({
      where: { key: { in: ['siteName', 'siteLogo', 'logoHeight', 'contactEmail', 'supportPhone', 'printServiceEnabled'] } }
    });
    const result = {};
    records.forEach(r => { result[r.key] = r.value; });
    res.json(result);
  } catch {
    res.json({ siteName: 'WeddingInvite Pro', siteLogo: null });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/weddings', weddingRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invitation-orders', invitationOrderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/checkin', checkInRoutes);
app.use('/api/backgrounds', backgroundRoutes);
app.use('/api/print-orders', printOrderRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/public', publicRoutes); // Public invitation routes
app.use('/api/fonts', require('./routes/font.routes')); // Custom font upload/list
app.use('/api/webhooks', require('./routes/webhook.routes')); // K-PAY callbacks
app.use('/s', require('./routes/share.routes')); // OG share links (rich WhatsApp/FB preview → redirects to /i)

// Live online users registry (socketId -> userId), exposed for the admin
// supervision dashboard.
const onlineUsers = new Map();
app.set('onlineUsers', onlineUsers);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join-user', (userId) => {
    socket.join(`user:${userId}`);
    if (userId) onlineUsers.set(socket.id, userId);
    logger.info(`Socket ${socket.id} joined user:${userId}`);
  });

  socket.on('join-wedding', (weddingId) => {
    socket.join(`wedding-${weddingId}`);
    logger.info(`Socket ${socket.id} joined wedding-${weddingId}`);
  });

  socket.on('leave-wedding', (weddingId) => {
    socket.leave(`wedding-${weddingId}`);
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler — content-negotiated. API clients (XHR/fetch, Accept: json) get
// JSON; a human navigating in a browser (Accept: text/html) gets a styled 404
// page instead of raw JSON. Same for unknown/unauthorized routes.
app.use((req, res) => {
  res.status(404);
  const frontendUrl = process.env.FRONTEND_URL || '/';
  if (!req.path.startsWith('/api') && req.accepts('html')) {
    return res.type('html').send(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>404 — Page introuvable</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,#fdf2f8,#fff,#fffbeb);color:#1f2937;padding:24px}
  .card{text-align:center;max-width:420px}
  .code{font-size:96px;font-weight:800;line-height:1;
    background:linear-gradient(135deg,#df6746,#ec4899);-webkit-background-clip:text;
    background-clip:text;-webkit-text-fill-color:transparent}
  h1{font-size:22px;margin:12px 0 8px}
  p{color:#6b7280;margin-bottom:24px}
  a{display:inline-block;background:#df6746;color:#fff;text-decoration:none;
    padding:12px 28px;border-radius:9999px;font-weight:600}
</style></head>
<body><div class="card">
  <div class="code">404</div>
  <h1>Page introuvable</h1>
  <p>Cette page n'existe pas ou vous n'y avez pas accès.</p>
  <a href="${frontendUrl}">Retour à l'accueil</a>
</div></body></html>`);
  }
  res.json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Self-heal known schema drift (adds any missing columns on drifted DBs, e.g.
// weddings.code_type). Idempotent + no-op when up to date. Runs BEFORE accepting
// traffic so the first requests after a deploy never 500 on a missing column.
// It never throws (errors are caught inside), so startup always proceeds.
const { ensureSchema } = require('./utils/ensureSchema');
ensureSchema(prisma).finally(() => {
  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = { app, io, prisma };
