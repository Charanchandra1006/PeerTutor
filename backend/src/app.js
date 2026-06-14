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
const groupSessionRoutes = require('./modules/group-sessions/group-session.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const escapeRoomRoutes = require('./modules/escape-room/escapeRoom.routes');

// ── Create Express App ──
const app = express();
const httpServer = createServer(app);

// ── Passport (Google OAuth) ──
const passport = require('./modules/auth/passport');
app.use(passport.initialize());

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

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
    socket.userId = decoded.sub;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    logger.warn('Socket auth failed', { error: err.message });
    next(new Error('Invalid token'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info('Socket connected', { socketId: socket.id, userId: socket.userId });

  // Automatically join user's personal notification room
  socket.join(`user:${socket.userId}`);
  logger.debug('Auto-joined user room', { userId: socket.userId, socketId: socket.id });

  // Join session room for in-session chat (verified against userId)
  socket.on('join:session', async (sessionId) => {
    try {
      const { Session } = require('./modules/bookings/booking.model');
      const session = await Session.findById(sessionId).populate('tutor_id');
      if (!session) return;
      
      const uid = socket.userId.toString();
      const isStudent = session.student_id?.toString() === uid;
      const isGroupMember = session.group_students?.some(s => s.toString() === uid);
      const tutorUserId = session.tutor_id?.user_id?._id || session.tutor_id?.user_id || session.tutor_id;
      const isTutor = tutorUserId?.toString() === uid;
      
      if (isStudent || isGroupMember || isTutor || socket.userRole === 'admin') {
        socket.join(`session:${sessionId}`);
        logger.debug('Joined session room', { sessionId, socketId: socket.id, userId: socket.userId });
      } else {
        logger.warn('Unauthorized attempt to join session room', { sessionId, userId: socket.userId });
      }
    } catch (err) {
      logger.error('Error joining session', { error: err.message, sessionId, userId: socket.userId });
    }
  });

  // In-session chat message
  socket.on('session:message', (data) => {
    const { stripHtml } = require('./utils/sanitize');
    io.to(`session:${data.sessionId}`).emit('session:message', {
      senderId: socket.userId,
      senderName: stripHtml(data.senderName),
      message: stripHtml(data.message),
      fileUrl: data.fileUrl ? stripHtml(data.fileUrl) : null,
      timestamp: new Date(),
    });
  });

  // Session status updates
  socket.on('session:status', (data) => {
    io.to(`session:${data.sessionId}`).emit('session:status', data);
  });

  socket.on('disconnect', () => {
    logger.debug('Socket disconnected', { socketId: socket.id, userId: socket.userId });
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
  const response = { status: 'ok', timestamp: new Date().toISOString() };
  if (config.env !== 'production') {
    response.uptime = process.uptime();
    response.environment = config.env;
    response.version = '1.0.0';
  }
  res.json(response);
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
app.use(`${API_PREFIX}/group-sessions`, groupSessionRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/escape-room`, escapeRoomRoutes);

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
    // Basic admin auth check for metrics
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send('Unauthorized');
    }
    try {
      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
      if (decoded.role !== 'admin') {
        return res.status(403).send('Forbidden');
      }
    } catch (err) {
      return res.status(401).send('Unauthorized');
    }

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
