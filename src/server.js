const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const connectDB = require('./config/database');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const gridRoutes = require('./routes/grid');
const aiRoutes = require('./routes/ai');
const alchemyRoutes = require('./routes/alchemy');
const collectionRoutes = require('./routes/collection');
const haloRoutes = require('./routes/halo');
const postingRoutes = require('./routes/posting');
const linkInBioRoutes = require('./routes/linkinbio');
const brandKitRoutes = require('./routes/brandkit');
const mediaKitRoutes = require('./routes/mediakit');
const workspaceRoutes = require('./routes/workspace');
const approvalRoutes = require('./routes/approval');
const youtubeRoutes = require('./routes/youtube');
const rolloutRoutes = require('./routes/rollout');
const reelCollectionRoutes = require('./routes/reelCollection');
const profileRoutes = require('./routes/profile');
const schedulingService = require('./services/schedulingService');

// Connect to MongoDB
connectDB();

// Start scheduling service
setTimeout(() => {
  schedulingService.start();
}, 5000); // Start after 5 seconds to ensure DB is connected

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for local development
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs (increased for batch uploads)
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3002',
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
app.use('/api/alchemy', alchemyRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/halo', haloRoutes);
app.use('/api/post', postingRoutes);
app.use('/api/linkinbio', linkInBioRoutes);
app.use('/api/brandkit', brandKitRoutes);
app.use('/api/mediakit', mediaKitRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/approval', approvalRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/rollout', rolloutRoutes);
app.use('/api/reel-collections', reelCollectionRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve the minimalist planner if the Vite build exists
const alchemyDistPath = path.join(__dirname, '../public/alchemy');
if (fs.existsSync(alchemyDistPath)) {
  app.use('/alchemy', express.static(alchemyDistPath));
  app.get('/alchemy/*', (req, res) => {
    res.sendFile(path.join(alchemyDistPath, 'index.html'));
  });
} else {
  console.warn('⚠️  Alchemy client build missing. Run `npm run mini:publish` to generate it.');
}

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
  ║     🐼 PostPanda - AI Content Planner Started        ║
  ║                                                       ║
  ║     🌐 Server: http://localhost:${PORT}                 ║
  ║     📊 API: http://localhost:${PORT}/api              ║
  ║     ❤️  Health: http://localhost:${PORT}/api/health     ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
