// backend/server.js
// AI Customer Support Platform - Main Server Entry Point

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./config/logger');
const { validateEnvironment } = require('./config/validation');
const { testConnection } = require('./config/database');
const { startDailySummaryScheduler } = require('./services/dailySummaryScheduler');
const { startAutoSyncWorker } = require('./services/autoSyncWorker');

// Validate environment before starting
try {
  validateEnvironment();
} catch (err) {
  console.error('❌ Startup failed:', err.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

logger.info('🚀 Initializing AI ChatBot API', {
  environment: process.env.NODE_ENV || 'development',
  demoMode: false,
});

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Custom request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[logLevel](`${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  
  next();
});

// CORS - allow frontend & widget origins
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-secret'],
};
app.use(cors(corsOptions));

// Widget chat & script requests can come from any origin
app.use('/api/chat', cors());
app.use('/widget.js', cors());

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve widget static file
app.use(express.static(path.join(__dirname, '..', 'widget')));

// Global rate limiter (1000 requests per 15 min per IP — generous for dev)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// ============================================
// ROUTES
// ============================================

const authRoutes = require('./routes/auth');
const chatbotRoutes = require('./routes/chatbots');
const chatRoutes = require('./routes/chat');
const scrapeRoutes = require('./routes/scrape');
const integrationRoutes = require('./routes/integrations');
const billingRoutes = require('./routes/billing');
const workspaceRoutes = require('./routes/workspaces');
const analyticsRoutes = require('./routes/analytics');
const apiKeysRoutes = require('./routes/apiKeys');
const auditRoutes = require('./routes/audit');
const trainingSourcesRoutes = require('./routes/trainingSources');
const systemRoutes = require('./routes/system');

// Root endpoint with API info
app.get('/', (req, res) => {
  res.json({
    name: 'AI Customer Support Platform API',
    version: '1.0.0',
    documentation: '/api/docs',
    landing: '/landing',
    status: 'running',
  });
});

// Landing page endpoint
app.get('/landing', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'go.html'));
});

// API docs endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    endpoints: {
      auth: [
        { method: 'POST', path: '/api/auth/signup', description: 'Create new account', auth: false },
        { method: 'POST', path: '/api/auth/login', description: 'Login user', auth: false },
        { method: 'GET', path: '/api/auth/me', description: 'Get current user profile', auth: true },
        { method: 'PUT', path: '/api/auth/profile', description: 'Update user profile', auth: true },
        { method: 'POST', path: '/api/auth/change-password', description: 'Change password', auth: true },
      ],
      chatbots: [
        { method: 'GET', path: '/api/chatbots', description: 'List all chatbots', auth: true },
        { method: 'POST', path: '/api/chatbots', description: 'Create new chatbot', auth: true },
        { method: 'GET', path: '/api/chatbots/:id', description: 'Get chatbot details', auth: true },
        { method: 'PUT', path: '/api/chatbots/:id', description: 'Update chatbot', auth: true },
        { method: 'DELETE', path: '/api/chatbots/:id', description: 'Delete chatbot', auth: true },
        { method: 'GET', path: '/api/chatbots/:id/conversations', description: 'Get conversations', auth: true },
      ],
      chat: [
        { method: 'POST', path: '/api/chat', description: 'Send message', auth: false },
        { method: 'GET', path: '/api/chat/history', description: 'Get chat history (requires chatbotId, sessionId)', auth: false },
      ],
      scrape: [
        { method: 'POST', path: '/api/scrape', description: 'Start scraping URL', auth: true },
        { method: 'POST', path: '/api/scrape/raw-text', description: 'Train from raw text input', auth: true },
        { method: 'POST', path: '/api/scrape/sitemap', description: 'Bulk train from sitemap URLs', auth: true },
        { method: 'POST', path: '/api/scrape/upload', description: 'Train from PDF/DOCX/TXT upload', auth: true },
        { method: 'GET', path: '/api/scrape/status/:contentId', description: 'Check scrape status', auth: true },
      ],
      integrations: [
        { method: 'GET', path: '/api/integrations/:chatbotId', description: 'Get integration settings and stats', auth: true },
        { method: 'PUT', path: '/api/integrations/:chatbotId/webhook', description: 'Upsert webhook integration', auth: true },
        { method: 'POST', path: '/api/integrations/:chatbotId/test-handoff', description: 'Test human handoff webhook', auth: true },
        { method: 'GET', path: '/api/integrations/:chatbotId/leads', description: 'List captured leads', auth: true },
        { method: 'GET', path: '/api/integrations/:chatbotId/leads/export.csv', description: 'Export leads CSV', auth: true },
        { method: 'GET', path: '/api/integrations/:chatbotId/handoffs', description: 'List handoff queue for agent inbox', auth: true },
        { method: 'PATCH', path: '/api/integrations/:chatbotId/handoffs/:handoffId', description: 'Update handoff status/ticket mapping', auth: true },
        { method: 'GET', path: '/api/integrations/:chatbotId/daily-summary', description: 'Generate/get daily summary', auth: true },
        { method: 'POST', path: '/api/integrations/inbound/:provider/:chatbotId', description: 'Inbound provider sync for bi-directional threads', auth: false },
      ],
      billing: [
        { method: 'GET', path: '/api/billing/plans', description: 'List billing plans', auth: true },
        { method: 'GET', path: '/api/billing/subscription', description: 'Get current subscription', auth: true },
        { method: 'POST', path: '/api/billing/subscribe', description: 'Create PayPal subscription', auth: true },
        { method: 'POST', path: '/api/billing/cancel', description: 'Cancel PayPal subscription', auth: true },
        { method: 'POST', path: '/api/billing/webhook', description: 'PayPal webhook handler', auth: false },
      ],
      workspaces: [
        { method: 'GET', path: '/api/workspaces/current', description: 'Get current workspace summary', auth: true },
        { method: 'POST', path: '/api/workspaces/invites', description: 'Invite a team member', auth: true },
        { method: 'POST', path: '/api/workspaces/invites/accept', description: 'Accept a workspace invite', auth: true },
        { method: 'PATCH', path: '/api/workspaces/members/:memberId', description: 'Update member role', auth: true },
        { method: 'DELETE', path: '/api/workspaces/invites/:inviteId', description: 'Revoke invite', auth: true },
        { method: 'PATCH', path: '/api/workspaces/security', description: 'Update workspace security settings', auth: true },
      ],
      analytics: [
        { method: 'GET', path: '/api/analytics/summary', description: 'Analytics summary and timeline', auth: true },
        { method: 'GET', path: '/api/analytics/conversations', description: 'List conversations for review', auth: true },
        { method: 'GET', path: '/api/analytics/conversations/:conversationId', description: 'Conversation detail', auth: true },
        { method: 'POST', path: '/api/analytics/conversations/:conversationId/feedback', description: 'Submit conversation feedback', auth: true },
      ],
      apiKeys: [
        { method: 'GET', path: '/api/keys', description: 'List API keys', auth: true },
        { method: 'POST', path: '/api/keys', description: 'Create API key', auth: true },
        { method: 'DELETE', path: '/api/keys/:keyId', description: 'Revoke API key', auth: true },
      ],
      audit: [
        { method: 'GET', path: '/api/audit', description: 'List audit logs', auth: true },
        { method: 'GET', path: '/api/audit/export.csv', description: 'Export audit logs CSV', auth: true },
      ],
      trainingSources: [
        { method: 'GET', path: '/api/training-sources', description: 'List auto-sync sources', auth: true },
        { method: 'PATCH', path: '/api/training-sources/:sourceId', description: 'Update auto-sync source', auth: true },
        { method: 'GET', path: '/api/training-sources/:sourceId/logs', description: 'Source sync logs', auth: true },
      ],
      utility: [
        { method: 'GET', path: '/api/health', description: 'Health check', auth: false },
        { method: 'GET', path: '/widget.js', description: 'Embed widget script', auth: false },
      ],
      reliability: [
        { method: 'GET', path: '/api/system/monitor', description: 'Operational job/queue monitoring metrics', auth: true },
        { method: 'POST', path: '/api/system/auto-sync', description: 'Queue auto-sync jobs (cron secret)', auth: false },
      ],
      widgetWorkflow: [
        { method: 'POST', path: '/api/chat/lead', description: 'Capture a lead from widget flow', auth: false },
        { method: 'POST', path: '/api/chat/escalate', description: 'Request human escalation from widget', auth: false },
      ],
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/chatbots', chatbotRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/scrape', scrapeRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/keys', apiKeysRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/training-sources', trainingSourcesRoutes);
app.use('/api/system', systemRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    demoMode: false,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler with helpful error info
app.use((req, res) => {
  const method = req.method;
  const path = req.path;
  
  logger.warn(`Route not found: ${method} ${path}`, { 
    ip: req.ip,
    query: req.query,
    body: method !== 'GET' ? 'present' : undefined,
  });
  
  // Check if it's a common mistake
  let suggestion = '';
  if (path.includes('/auth') && !path.includes('/api/auth')) {
    suggestion = ' (Did you mean /api/auth/...?)';
  } else if (path.includes('/chatbots') && !path.includes('/api/chatbots')) {
    suggestion = ' (Did you mean /api/chatbots/...?)';
  } else if (path.includes('/chat') && !path.includes('/api/chat')) {
    suggestion = ' (Did you mean /api/chat/...?)';
  }
  
  res.status(404).json({ 
    error: `Route not found: ${method} ${path}${suggestion}`,
    availableEndpoints: [
      'POST   /api/auth/signup',
      'POST   /api/auth/login',
      'GET    /api/auth/me',
      'PUT    /api/auth/profile',
      'POST   /api/auth/change-password',
      'GET    /api/chatbots',
      'POST   /api/chatbots',
      'GET    /api/chatbots/:id',
      'PUT    /api/chatbots/:id',
      'DELETE /api/chatbots/:id',
      'GET    /api/chatbots/:id/conversations',
      'POST   /api/chat',
      'POST   /api/chat/lead',
      'POST   /api/chat/escalate',
      'GET    /api/chat/history',
      'POST   /api/scrape',
      'POST   /api/scrape/raw-text',
      'POST   /api/scrape/sitemap',
      'POST   /api/scrape/upload',
      'GET    /api/scrape/status/:contentId',
      'GET    /api/integrations/:chatbotId',
      'PUT    /api/integrations/:chatbotId/webhook',
      'POST   /api/integrations/:chatbotId/test-handoff',
      'GET    /api/integrations/:chatbotId/leads',
      'GET    /api/integrations/:chatbotId/leads/export.csv',
      'GET    /api/integrations/:chatbotId/handoffs',
      'PATCH  /api/integrations/:chatbotId/handoffs/:handoffId',
      'GET    /api/integrations/:chatbotId/daily-summary',
      'POST   /api/integrations/inbound/:provider/:chatbotId',
      'GET    /api/system/monitor',
      'GET    /api/health',
      'GET    /widget.js',
    ],
    hint: 'Check that your URL is correct and includes /api/ prefix. Auth endpoints (except /signup and /login) require a valid JWT token in Authorization header.',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ============================================
// SERVER START
// ============================================

app.listen(PORT, async () => {
  logger.info(`Server started successfully`, { port: PORT });
  logger.info(`Configuration`, {
    environment: process.env.NODE_ENV || 'development',
    demoMode: false,
  });

  // Test database connection
  await testConnection();
  startDailySummaryScheduler();
  startAutoSyncWorker();

  logger.info(`API endpoints available:`, {
    endpoints: [
      'POST /api/auth/signup',
      'POST /api/auth/login',
      'GET  /api/auth/profile',
      'POST /api/auth/password',
      'GET  /api/chatbots',
      'POST /api/chatbots',
      'GET  /api/chatbots/:id',
      'PUT  /api/chatbots/:id',
      'DELETE /api/chatbots/:id',
      'POST /api/chat',
      'POST /api/chat/lead',
      'POST /api/chat/escalate',
      'POST /api/scrape',
      'POST /api/scrape/raw-text',
      'POST /api/scrape/sitemap',
      'POST /api/scrape/upload',
      'GET  /api/integrations/:chatbotId',
      'GET  /api/integrations/:chatbotId/handoffs',
      'GET  /api/system/monitor',
      'GET  /api/chatbots/:id/conversations',
      'GET  /api/health',
      'GET  /widget.js',
    ],
  });
});

module.exports = app;
