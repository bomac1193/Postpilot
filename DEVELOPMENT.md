# PostPilot - Development Guide

This guide covers everything you need to know to develop, extend, and maintain PostPilot.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Development Workflow](#development-workflow)
- [API Development](#api-development)
- [Database Schema](#database-schema)
- [Frontend Development](#frontend-development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- Node.js v16+ ([Download](https://nodejs.org/))
- MongoDB v5+ ([Installation Guide](https://docs.mongodb.com/manual/installation/))
- Git ([Download](https://git-scm.com/))
- Code Editor (VS Code recommended)

### Initial Setup

```bash
# Clone or navigate to project
cd postpilot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start MongoDB
sudo systemctl start mongod

# Run development server
npm run dev

# Server will start at http://localhost:3000
```

## Project Architecture

### Directory Structure

```
postpilot/
├── src/
│   ├── config/          # Configuration files
│   │   └── database.js  # MongoDB connection
│   ├── controllers/     # Request handlers
│   │   ├── authController.js
│   │   ├── contentController.js
│   │   ├── gridController.js
│   │   └── aiController.js
│   ├── models/          # Mongoose schemas
│   │   ├── User.js
│   │   ├── Content.js
│   │   └── Grid.js
│   ├── routes/          # Express routes
│   │   ├── auth.js
│   │   ├── content.js
│   │   ├── grid.js
│   │   └── ai.js
│   ├── middleware/      # Custom middleware
│   │   ├── auth.js      # JWT authentication
│   │   └── upload.js    # File upload handling
│   ├── services/        # Business logic
│   │   └── aiService.js # AI analysis service
│   ├── utils/           # Helper functions
│   │   ├── helpers.js   # General utilities
│   │   └── validators.js # Input validation
│   └── server.js        # Express app entry
├── public/              # Frontend files
│   ├── index.html       # Single Page App
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
└── uploads/             # User uploads
```

### Tech Stack

**Backend:**
- Express.js - Web framework
- Mongoose - MongoDB ODM
- JWT - Authentication
- Multer - File uploads
- Sharp - Image processing
- Bcrypt - Password hashing

**Frontend:**
- Vanilla JavaScript
- Modern CSS (Grid, Flexbox)
- Fetch API for requests

**AI/ML:**
- OpenAI GPT-4 Vision API
- TensorFlow.js (ready for integration)
- Google Cloud Vision (ready for integration)

## Development Workflow

### Running the Development Server

```bash
# Start with nodemon (auto-restart on changes)
npm run dev

# Or start normally
npm start
```

### Code Style Guidelines

**JavaScript:**
- Use `const` and `let`, avoid `var`
- Use async/await for asynchronous operations
- Always handle errors in try-catch blocks
- Use descriptive variable names
- Add comments for complex logic

**API Responses:**
```javascript
// Success response
res.json({
  message: 'Operation successful',
  data: { /* ... */ }
});

// Error response
res.status(400).json({
  error: 'Error message',
  details: [] // Optional
});
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Add feature: description"

# Push to remote
git push origin feature/your-feature-name

# Create pull request
```

## API Development

### Adding a New Endpoint

1. **Create Controller Function** (`src/controllers/yourController.js`):

```javascript
exports.yourFunction = async (req, res) => {
  try {
    // Your logic here
    const result = await YourModel.find();

    res.json({
      message: 'Success',
      data: result
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
};
```

2. **Add Route** (`src/routes/yourRoute.js`):

```javascript
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { yourFunction } = require('../controllers/yourController');

router.get('/endpoint', authenticate, yourFunction);

module.exports = router;
```

3. **Register Route** (`src/server.js`):

```javascript
const yourRoutes = require('./routes/yourRoute');
app.use('/api/your-route', yourRoutes);
```

### Authentication

Protected routes require JWT token in Authorization header:

```javascript
const { authenticate } = require('../middleware/auth');

router.get('/protected', authenticate, (req, res) => {
  // req.user contains authenticated user
  res.json({ user: req.user });
});
```

### File Uploads

Use the upload middleware for handling files:

```javascript
const { upload } = require('../middleware/upload');

router.post('/upload',
  authenticate,
  upload.single('file'),
  (req, res) => {
    // req.file contains uploaded file
    res.json({ file: req.file });
  }
);
```

## Database Schema

### User Model

```javascript
{
  email: String (unique),
  password: String (hashed),
  name: String,
  socialAccounts: {
    instagram: {
      connected: Boolean,
      accessToken: String,
      userId: String,
      username: String,
      expiresAt: Date
    },
    tiktok: { /* similar */ }
  },
  createdAt: Date,
  lastLogin: Date
}
```

### Content Model

```javascript
{
  userId: ObjectId (ref: User),
  title: String,
  caption: String,
  mediaUrl: String,
  thumbnailUrl: String,
  mediaType: String (image/video/carousel),
  platform: String (instagram/tiktok),
  aiScores: {
    viralityScore: Number (0-100),
    engagementScore: Number (0-100),
    aestheticScore: Number (0-100),
    trendScore: Number (0-100),
    overallScore: Number (0-100),
    analyzedAt: Date
  },
  status: String (draft/scheduled/published),
  scheduledFor: Date,
  createdAt: Date
}
```

### Adding New Fields

```javascript
// 1. Update model schema
const ContentSchema = new mongoose.Schema({
  // existing fields...
  newField: {
    type: String,
    required: false,
    default: null
  }
});

// 2. Update controller logic
// 3. Update frontend to use new field
```

## Frontend Development

### Project Structure

The frontend is a Single Page Application (SPA) in `public/index.html`.

### Main Components

1. **Authentication** - Login/Register modals
2. **Dashboard** - Overview and stats
3. **Content Library** - Manage uploaded content
4. **Grid Planner** - Visual feed preview
5. **AI Analytics** - AI scores and insights

### Making API Requests

```javascript
// Example API call
async function fetchContent() {
  try {
    const response = await fetch('/api/content', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch');

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    showError('Failed to load content');
  }
}
```

### State Management

State is managed in `public/js/app.js`:

```javascript
const state = {
  user: null,
  currentContent: [],
  currentGrid: null,
  currentView: 'dashboard'
};
```

## Testing

### Manual Testing Checklist

- [ ] User registration and login
- [ ] File upload (images and videos)
- [ ] AI analysis runs on upload
- [ ] Grid creation and content addition
- [ ] Grid preview displays correctly
- [ ] Content editing and deletion
- [ ] Social media OAuth flow (if configured)

### API Testing with curl

```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Get content (requires token)
curl http://localhost:3000/api/content \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Testing AI Features

If you don't have an OpenAI API key, the AI service will use heuristic fallback scoring. To test with real AI:

1. Get API key from [OpenAI Platform](https://platform.openai.com/)
2. Add to `.env`: `OPENAI_API_KEY=sk-your-key`
3. Restart server
4. Upload content and check AI scores

## Deployment

### Environment Variables for Production

Update `.env` for production:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-strong-jwt-secret-here
SESSION_SECRET=your-strong-session-secret-here
OPENAI_API_KEY=sk-your-production-key
FRONTEND_URL=https://yourdomain.com
```

### Deployment Steps

1. **Prepare Server:**
   ```bash
   # Install Node.js and MongoDB
   # Clone repository
   npm install --production
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Start Application:**
   ```bash
   # Using PM2 (recommended)
   npm install -g pm2
   pm2 start src/server.js --name postpilot
   pm2 save
   pm2 startup

   # Or using systemd service
   # Create /etc/systemd/system/postpilot.service
   ```

4. **Set up Nginx (optional):**
   ```nginx
   server {
     listen 80;
     server_name yourdomain.com;

     location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

5. **SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check logs
sudo tail -f /var/log/mongodb/mongod.log
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 PID

# Or change PORT in .env
```

### Upload Directory Permissions

```bash
# Ensure uploads directory is writable
chmod 755 uploads
mkdir -p uploads/thumbnails
```

### OpenAI API Errors

Common issues:
- **Rate limit**: Slow down requests or upgrade plan
- **Invalid key**: Check API key in .env
- **Quota exceeded**: Add credits to OpenAI account

The app will automatically fall back to heuristic scoring if OpenAI fails.

### Dependencies Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Useful Resources

- [Express.js Docs](https://expressjs.com/)
- [Mongoose Docs](https://mongoosejs.com/)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [TikTok API](https://developers.tiktok.com/)

## Contributing

When adding new features:

1. Create a feature branch
2. Write clean, commented code
3. Test thoroughly
4. Update documentation
5. Create pull request with description

---

**Happy Coding!** If you have questions, open an issue on GitHub.
