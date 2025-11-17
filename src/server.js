const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const gridRoutes = require('./routes/grid');
const aiRoutes = require('./routes/ai');
const collectionRoutes = require('./routes/collection');
const postingRoutes = require('./routes/posting');
const schedulingService = require('./services/schedulingService');

// Connect to MongoDB
connectDB();

// Start scheduling service
setTimeout(() => {
  schedulingService.start();
}, 5000); // Start after 5 seconds to ensure DB is connected

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for local development
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'postpilot-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/grid', gridRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/post', postingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║     ✈️  PostPilot - AI Content Planner Started       ║
  ║                                                       ║
  ║     🌐 Server: http://localhost:${PORT}                 ║
  ║     📊 API: http://localhost:${PORT}/api              ║
  ║     ❤️  Health: http://localhost:${PORT}/api/health     ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
