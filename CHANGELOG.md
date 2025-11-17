# Changelog

All notable changes to PostPilot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-11-17

### Added - MAJOR RELEASE

**Collection System:**
- Full collection management system for organizing grid layouts
- Create unlimited collections with custom grid sizes
- Drag-and-drop interface for content organization
- Collection states (draft, scheduled, posting, completed, paused, failed)
- Real-time progress tracking and statistics
- Duplicate collections for campaigns
- Collection-specific tags and descriptions

**Instagram Integration:**
- Complete Instagram Graph API v18.0 integration
- Post images with captions and hashtags
- Post videos with async processing
- Long-lived token management (60-day expiry)
- Automatic token refresh
- Media container creation and publishing
- Post URL and ID tracking
- Error handling and retry logic

**TikTok Integration:**
- TikTok Open API v2 integration
- Video upload and publishing
- Chunk-based file upload for large videos
- Async processing with status polling
- Privacy level configuration
- Duet/Comment/Stitch controls
- Error tracking and recovery

**Automated Scheduling:**
- Comprehensive scheduling service with cron-like behavior
- Multiple interval options (daily, every-other-day, weekly, custom)
- Specific posting time configuration (hour/minute)
- Timezone support
- Auto-posting to Instagram and TikTok
- Sequential posting from collections
- Manual trigger support
- Pause/resume functionality
- Start and end date controls

**Drag-and-Drop UI:**
- Intuitive drag-and-drop grid interface
- Drag content from library to grid positions
- Reorder items within collection
- Visual grid preview
- Posted item indicators
- Real-time updates
- Mobile-responsive design ready

**API Endpoints (20+ new):**
- Collection CRUD operations (6 endpoints)
- Content management within collections (3 endpoints)
- Posting operations (7 endpoints)
- Statistics and previews (2 endpoints)
- Schedule management (2 endpoints)

**Models:**
- Collection model with comprehensive schema
  * Grid configuration
  * Scheduling settings
  * Statistics tracking
  * Error logging
  * Status management
- Updated Content model with platform post tracking

**Services:**
- Social Media Service (`socialMediaService.js`)
  * Instagram posting logic
  * TikTok posting logic
  * Multi-platform support
  * Token management
  * Public URL generation
- Scheduling Service (`schedulingService.js`)
  * Automated collection processing
  * Cron-like scheduler
  * Error recovery
  * Manual triggers
  * Service status reporting

**Documentation:**
- Complete Collections Guide (`COLLECTIONS_GUIDE.md`)
  * Setup instructions for Instagram/TikTok APIs
  * Collection creation tutorial
  * Scheduling configuration
  * Drag-and-drop usage
  * API reference
  * Troubleshooting guide
  * Best practices

**Frontend:**
- Collections Manager (`collections.js`)
  * Collection list and selector
  * Grid visualization
  * Drag-and-drop handlers
  * Schedule modal
  * Statistics dashboard
  * Real-time status updates

### Changed
- Server now automatically starts scheduling service on boot
- Content model includes platformPostUrl and platformPostId fields
- Enhanced error tracking throughout the application
- Improved API response consistency

### Technical Details
- Instagram requires publicly accessible media URLs
- TikTok supports video-only content
- Scheduling service checks every 60 seconds
- Collections support up to 9 columns
- Async operations use polling (Instagram videos, TikTok uploads)
- Comprehensive error logging with timestamps and codes
- Database indexes for performance optimization
- Graceful shutdown handling for scheduling service

### Breaking Changes
- Collection system introduces new workflow (grids still supported)
- Instagram/TikTok posting requires API credentials
- Server must be publicly accessible for Instagram posting
- MongoDB required for scheduling persistence

### Dependencies
- No new external dependencies added
- All integrations use existing packages (axios, mongoose, etc.)
- FormData support for multipart uploads

### Known Limitations
- Instagram carousel posting not yet implemented
- Instagram requires business/creator accounts
- TikTok video processing may take 30-60 seconds
- Scheduling granularity is 1 minute
- Token refresh must be done manually if expired during posting

### Migration Notes
For users upgrading from v1.x:
1. Add social media API credentials to `.env`
2. Restart server to initialize scheduling service
3. Connect Instagram/TikTok accounts via Settings
4. Create collections and migrate existing grids if desired

## [1.0.1] - 2024-11-17

### Added
- Comprehensive utility functions in `src/utils/helpers.js`
  - Email validation
  - Filename sanitization
  - File size formatting
  - Caption score calculation
  - Hashtag extraction and validation
  - Optimal posting time recommendations
  - Date formatting utilities
- Input validation utilities in `src/utils/validators.js`
  - User registration validation
  - Content validation
  - File upload validation
  - Hashtag validation
  - Schedule date validation
  - XSS prevention through input sanitization
- Development documentation (`DEVELOPMENT.md`)
  - Complete project architecture overview
  - API development guide
  - Frontend development guide
  - Database schema documentation
  - Deployment instructions
  - Troubleshooting guide
- Contributing guidelines (`CONTRIBUTING.md`)
  - Code style guidelines
  - Pull request process
  - Testing requirements
  - Security best practices
- Version tracking (`CHANGELOG.md`)

### Changed
- Updated MongoDB connection to remove deprecated options
  - Removed `useNewUrlParser` (deprecated in driver v4.0.0)
  - Removed `useUnifiedTopology` (deprecated in driver v4.0.0)
  - Eliminates deprecation warnings on server startup

### Fixed
- MongoDB connection deprecation warnings
- Package installation issues with corrupted node_modules

### Technical
- Git repository initialized
- All core files committed to version control
- Project structure organized and documented

## [1.0.0] - 2024-11-17

### Added
- Initial release of PostPilot
- User authentication system with JWT
  - Registration and login
  - Password hashing with bcrypt
  - Session management
- Social media OAuth integration
  - Instagram OAuth2 authentication
  - TikTok OAuth2 authentication
  - Social account connection management
- Content management system
  - Image and video upload (up to 100MB)
  - Content library with filtering
  - Multi-version support for A/B testing
  - Status tracking (draft/scheduled/published)
  - Scheduling system
- AI-powered analytics
  - Virality score prediction (0-100)
  - Engagement score estimation (0-100)
  - Aesthetic quality analysis (0-100)
  - Trend alignment scoring (0-100)
  - Overall content score
  - Content type recommendations (post/carousel/reel)
  - Smart hashtag generation (up to 30 tags)
  - AI caption generation (multiple variations)
  - Best shot selection from versions
  - Heuristic fallback when OpenAI unavailable
- Visual grid planner
  - Instagram feed preview
  - Multiple grid support
  - Dynamic row addition/removal
  - Drag-and-drop ready structure
  - Real-time preview updates
- Frontend SPA
  - Dashboard view
  - Content library view
  - Grid planner view
  - AI analytics view
  - Responsive design (mobile, tablet, desktop)
  - Modal-based UI for actions
- Backend API (35+ endpoints)
  - RESTful API design
  - Rate limiting (100 req/15min)
  - Security headers with Helmet.js
  - CORS configuration
  - File upload handling with Multer
  - Image processing with Sharp
- Database models
  - User schema with social accounts
  - Content schema with AI scores
  - Grid schema with cell positioning
- Security features
  - JWT token authentication
  - Password hashing (10 salt rounds)
  - HTTP-only cookies
  - Input validation
  - Secure file upload handling
  - Rate limiting on all API routes
- Documentation
  - Complete README with setup guide
  - API documentation (35+ endpoints)
  - Quick start guide
  - Project summary
  - Environment configuration examples

### Technical Stack
- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Authentication**: JWT, Bcrypt, Passport.js
- **AI/ML**: OpenAI GPT-4 Vision API
- **File Handling**: Multer, Sharp
- **Frontend**: Vanilla JavaScript, Modern CSS
- **Security**: Helmet.js, CORS, Express Rate Limit

### Known Limitations
- Direct posting to Instagram/TikTok not yet implemented (requires platform API credentials)
- Drag-and-drop grid rearrangement UI not yet implemented (structure ready)
- Real post performance analytics not yet implemented
- Team collaboration features not yet implemented
- Calendar view not yet implemented
- Video editing capabilities not yet implemented

---

## Future Versions (Roadmap)

### [1.1.0] - Planned
- Direct posting to Instagram and TikTok
- Drag-and-drop grid rearrangement UI
- Real-time post performance tracking
- Improved AI analysis with more models

### [1.2.0] - Planned
- Calendar view for content scheduling
- Team collaboration features
- Bulk upload and scheduling
- Instagram Stories planner

### [2.0.0] - Planned
- Video editing capabilities
- Advanced analytics dashboard
- A/B testing automation
- More platform integrations (Twitter, LinkedIn, Pinterest)
- Mobile apps (iOS/Android)

---

[1.0.1]: https://github.com/yourusername/postpilot/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/yourusername/postpilot/releases/tag/v1.0.0
