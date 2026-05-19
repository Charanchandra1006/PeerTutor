require('express-async-errors');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server: SocketServer } = require('socket.io');
const config = require('./config/env');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { publicLimiter } = require('./middleware/rateLimiter');

// ── Import Routes ──
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const tutorRoutes = require('./modules/tutors/tutor.routes');
const bookingRoutes = require('./modules/bookings/booking.routes');
const walletRoutes = require('./modules/wallet/wallet.routes');
const reviewRoutes = require('./modules/reviews/review.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const adminRoutes = require('./modules/admin/admin.routes');

// ── Create Express App ──
const app = express();
const httpServer = createServer(app);

// ── Socket.io Setup ──
const io = new SocketServer(httpServer, {
  cors: {
    origin: config.corsOrigin.split(','),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info('Socket connected', { socketId: socket.id });

  // Join user's personal notification room
  socket.on('join:user', (userId) => {
    socket.join(`user:${userId}`);
    logger.debug('Joined user room', { userId, socketId: socket.id });
  });

  // Join session room for in-session chat
  socket.on('join:session', (sessionId) => {
    socket.join(`session:${sessionId}`);
    logger.debug('Joined session room', { sessionId, socketId: socket.id });
  });

  // In-session chat message
  socket.on('session:message', (data) => {
    io.to(`session:${data.sessionId}`).emit('session:message', {
      senderId: data.senderId,
      senderName: data.senderName,
      message: data.message,
      fileUrl: data.fileUrl,
      timestamp: new Date(),
    });
  });

  // Session status updates
  socket.on('session:status', (data) => {
    io.to(`session:${data.sessionId}`).emit('session:status', data);
  });

  socket.on('disconnect', () => {
    logger.debug('Socket disconnected', { socketId: socket.id });
  });
});

// Make io accessible to services
app.set('io', io);

// ── Security Middleware ──
app.use(helmet({
  contentSecurityPolicy: config.env === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: config.corsOrigin.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── General Middleware ──
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
if (config.env !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// ── Rate Limiting ──
app.use('/api', publicLimiter);

// ── Health Check ──
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: '1.0.0',
  });
});

// ── API Routes ──
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/tutors`, tutorRoutes);
app.use(`${API_PREFIX}/bookings`, bookingRoutes);
app.use(`${API_PREFIX}/wallet`, walletRoutes);
app.use(`${API_PREFIX}/reviews`, reviewRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

// ── Prometheus Metrics (if prom-client is available) ──
try {
  const promClient = require('prom-client');
  const collectDefaultMetrics = promClient.collectDefaultMetrics;
  collectDefaultMetrics({ prefix: 'ptm_' });

  // Custom metrics
  const httpRequestDuration = new promClient.Histogram({
    name: 'ptm_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  });

  const sessionsBooked = new promClient.Counter({
    name: 'ptm_sessions_booked_total',
    help: 'Total number of sessions booked',
  });

  const creditsTransacted = new promClient.Counter({
    name: 'ptm_credits_transacted_total',
    help: 'Total credits transacted',
  });

  // Middleware to track request duration
  app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer();
    res.on('finish', () => {
      end({ method: req.method, route: req.route?.path || req.path, status: res.statusCode });
    });
    next();
  });

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  });

  app.set('metrics', { sessionsBooked, creditsTransacted });
} catch (err) {
  logger.warn('Prometheus metrics not available', { error: err.message });
}

// ── 404 and Error Handler (must be last) ──
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app, httpServer, io };
