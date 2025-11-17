# PostPilot Collections - Complete Guide

Collections are the heart of PostPilot's automated posting system. Create, schedule, and auto-post entire grid layouts to Instagram and TikTok.

## Table of Contents

- [What are Collections?](#what-are-collections)
- [Getting Started](#getting-started)
- [Creating Collections](#creating-collections)
- [Managing Content](#managing-content)
- [Scheduling Collections](#scheduling-collections)
- [Social Media Setup](#social-media-setup)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

## What are Collections?

A **Collection** is a planned grid/feed layout that can be scheduled for automated posting. Think of it as:

- A set of content items arranged in a grid
- A posting schedule (daily, weekly, custom intervals)
- Automated posting to Instagram and/or TikTok
- Progress tracking and error handling

**Use Cases:**
- Plan your Instagram feed aesthetics weeks in advance
- Schedule product launches with timed posts
- Automate daily content posting
- Maintain consistent posting schedule
- A/B test different grid layouts

## Getting Started

### Prerequisites

1. **MongoDB** running locally or in the cloud
2. **Instagram and/or TikTok** account credentials
3. **API Keys** configured in `.env`

### Quick Start

```bash
# 1. Ensure MongoDB is running
sudo systemctl start mongod

# 2. Configure your .env file with API keys
nano .env

# 3. Start PostPilot
npm run dev

# 4. Navigate to http://localhost:3000
```

## Social Media Setup

### Instagram Setup

Instagram posting uses the Instagram Graph API. Here's how to set it up:

#### 1. Create Facebook App

1. Go to https://developers.facebook.com/apps/
2. Click "Create App"
3. Select "Business" type
4. Fill in app details

#### 2. Add Instagram Product

1. In your app dashboard, click "Add Product"
2. Find "Instagram" and click "Set Up"
3. Complete the setup wizard

#### 3. Get Credentials

1. Go to Settings > Basic
2. Copy your App ID (Client ID)
3. Copy your App Secret (Client Secret)

#### 4. Configure Redirect URI

1. Add to Valid OAuth Redirect URIs:
   ```
   http://localhost:3000/api/auth/instagram/callback
   https://yourdomain.com/api/auth/instagram/callback
   ```

#### 5. Update .env

```env
INSTAGRAM_CLIENT_ID=your_app_id
INSTAGRAM_CLIENT_SECRET=your_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback
```

#### 6. Connect Account

1. In PostPilot, go to Settings
2. Click "Connect Instagram"
3. Authorize the app
4. Your Instagram is now connected!

**Important Notes:**
- Instagram requires publicly accessible URLs for media
- Your server must be accessible from the internet for posting
- Tokens expire after 60 days (auto-refresh supported)
- Instagram only supports business/creator accounts for posting

### TikTok Setup

TikTok posting uses the TikTok Open API.

#### 1. Register as Developer

1. Go to https://developers.tiktok.com/
2. Sign up as a developer
3. Complete verification

#### 2. Create App

1. Click "Manage Apps"
2. Create new app
3. Select "Login Kit" and "Video Kit"
4. Fill in app details

#### 3. Get Credentials

1. In app dashboard, find:
   - Client Key
   - Client Secret

#### 4. Configure Redirect

Add redirect URI:
```
http://localhost:3000/api/auth/tiktok/callback
https://yourdomain.com/api/auth/tiktok/callback
```

#### 5. Update .env

```env
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_REDIRECT_URI=http://localhost:3000/api/auth/tiktok/callback
```

#### 6. Connect Account

1. In PostPilot, go to Settings
2. Click "Connect TikTok"
3. Authorize the app
4. Your TikTok is now connected!

**Important Notes:**
- TikTok only supports video content
- Maximum video size: 72MB
- Videos must be in MP4 format
- Processing may take 30-60 seconds

## Creating Collections

### Via UI

1. Navigate to "Collections" view
2. Click "Create Collection"
3. Fill in details:
   - **Name**: Descriptive name (e.g., "October Product Launch")
   - **Description**: Optional notes
   - **Platform**: Instagram, TikTok, or Both
   - **Grid Size**: Columns x Rows (e.g., 3x3 for Instagram)

### Via API

```javascript
POST /api/collection

{
  "name": "Holiday Campaign",
  "description": "Holiday season posts",
  "platform": "instagram",
  "gridConfig": {
    "columns": 3,
    "rows": 5
  }
}
```

### Grid Configuration

**Instagram Recommendations:**
- **Feed Grid**: 3 columns (standard Instagram feed)
- Rows: As many as needed for your campaign
- Example: 3x6 = 18 posts for a 2-week campaign

**TikTok:**
- Columns: 1 (vertical feed)
- Rows: Number of videos to post

## Managing Content

### Adding Content to Collection

**Drag and Drop (Recommended):**

1. Open your collection
2. Content library appears at bottom
3. Drag content item to desired grid position
4. Drop to add to collection

**Via API:**

```javascript
POST /api/collection/:id/content

{
  "contentId": "content_id_here",
  "position": {
    "row": 0,
    "col": 1
  }
}
```

### Reordering Content

**Drag to Reorder:**
1. Drag existing item from one position
2. Drop on another position
3. Items automatically reorder

**Via API:**

```javascript
PUT /api/collection/:id/reorder

{
  "items": [
    {
      "contentId": "content_1",
      "position": { "row": 0, "col": 0 },
      "order": 0
    },
    {
      "contentId": "content_2",
      "position": { "row": 0, "col": 1 },
      "order": 1
    }
  ]
}
```

### Removing Content

- Click the "×" button on any item in the grid
- Or use API: `DELETE /api/collection/:id/content/:contentId`

## Scheduling Collections

### Schedule Options

**Intervals:**
- **Daily**: Post one item every day
- **Every Other Day**: Post every 2 days
- **Weekly**: Post once per week
- **Custom**: Specify hours between posts

**Posting Times:**
- Set specific time of day (e.g., 10:00 AM)
- Multiple time slots supported
- Timezone configuration

### Setting Up Schedule

**Via UI:**

1. Open collection
2. Click "Schedule Collection"
3. Configure:
   - Enable scheduling: ON
   - Start date: When to begin
   - End date: When to stop (optional)
   - Interval: How often to post
   - Posting time: Time of day
   - Auto-post: Enable automatic posting

4. Save schedule

**Via API:**

```javascript
PUT /api/collection/:id

{
  "scheduling": {
    "enabled": true,
    "startDate": "2024-12-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "interval": "daily",
    "postingTimes": [
      {
        "hour": 10,
        "minute": 0,
        "timezone": "America/New_York"
      }
    ],
    "autoPost": true,
    "postSequentially": true
  }
}
```

### How Auto-Posting Works

1. **Scheduling Service** runs every minute
2. Checks for collections with `nextPostAt <= now`
3. Gets next unposted item in collection
4. Validates social media credentials
5. Posts content to platform(s)
6. Marks item as posted
7. Calculates next post time
8. Repeats until all items posted

### Manual Posting

Post immediately without waiting for schedule:

**Single Item:**
```javascript
POST /api/post/collection/:id/item/:itemId
```

**Next Item:**
```javascript
POST /api/post/collection/:id
```

## Collection Management

### Viewing Collections

```javascript
GET /api/collection

// Filter by status
GET /api/collection?status=scheduled

// Filter by platform
GET /api/collection?platform=instagram

// Filter by active
GET /api/collection?active=true
```

### Collection States

- **draft**: Created but not scheduled
- **scheduled**: Scheduled for auto-posting
- **posting**: Currently posting an item
- **completed**: All items posted
- **paused**: Temporarily stopped
- **failed**: Error occurred

### Pausing/Resuming

**Pause:**
```javascript
POST /api/post/collection/:id/pause
```

**Resume:**
```javascript
POST /api/post/collection/:id/resume
```

### Duplicating Collections

Create a copy with same content but fresh posting status:

```javascript
POST /api/collection/:id/duplicate
```

Great for:
- Testing different schedules
- Reposting successful campaigns
- Creating variations

## API Reference

### Collection Endpoints

```
POST   /api/collection              Create collection
GET    /api/collection              List all collections
GET    /api/collection/:id          Get collection details
PUT    /api/collection/:id          Update collection
DELETE /api/collection/:id          Delete collection

POST   /api/collection/:id/content          Add content
DELETE /api/collection/:id/content/:contentId Remove content
PUT    /api/collection/:id/reorder          Reorder items

POST   /api/collection/:id/duplicate Duplicate collection
GET    /api/collection/:id/preview   Get grid preview
GET    /api/collection/stats         Get statistics
```

### Posting Endpoints

```
POST /api/post/content/:contentId            Post single content
POST /api/post/collection/:id                Post next item
POST /api/post/collection/:id/item/:itemId   Post specific item
POST /api/post/collection/:id/pause          Pause collection
POST /api/post/collection/:id/resume         Resume collection
GET  /api/post/status                        Service status
POST /api/post/instagram/refresh-token       Refresh token
```

## Troubleshooting

### Common Issues

**1. Instagram "Token Expired"**

Solution:
```javascript
POST /api/post/instagram/refresh-token
```

Or reconnect account in settings.

**2. "Media URL not accessible"**

Instagram needs publicly accessible URLs. Solutions:

- Deploy to server with public IP
- Use ngrok for local testing:
  ```bash
  ngrok http 3000
  # Update FRONTEND_URL in .env
  ```

**3. "Video Processing Failed"**

TikTok video issues:
- Check format (must be MP4)
- Check size (max 72MB)
- Check duration (min 3 sec, max 10 min)
- Ensure valid codec (H.264)

**4. Posts Not Auto-Posting**

Check:
```javascript
GET /api/post/status
```

Ensure:
- Service is running
- Collection status is `scheduled`
- `autoPost` is enabled
- Social media connected
- Next post time is valid

**5. "Failed to Post" Errors**

Check collection errors:
```javascript
GET /api/collection/:id
```

Look at `errors` array for details.

## Best Practices

### Content Preparation

1. **Instagram:**
   - Use 1080x1080 for square posts
   - 1080x1350 for portrait
   - Keep file size reasonable (<8MB)

2. **TikTok:**
   - Use 1080x1920 (9:16 aspect ratio)
   - MP4 format with H.264 codec
   - 15-60 seconds for best engagement

### Scheduling Strategy

1. **Research Optimal Times:**
   - Instagram: 10AM-3PM on weekdays
   - TikTok: 6AM-10AM, 7PM-11PM

2. **Consistency:**
   - Post same time daily
   - Maintain regular intervals
   - Don't overwhelm followers

3. **Planning:**
   - Schedule 1-2 weeks ahead
   - Leave buffer for real-time posts
   - Review and adjust based on analytics

### Error Handling

- Monitor collection errors regularly
- Set up notifications (future feature)
- Keep backup of content
- Test with draft collections first

## Advanced Usage

### Custom Intervals

Post every 6 hours:

```javascript
{
  "scheduling": {
    "interval": "custom",
    "customIntervalHours": 6
  }
}
```

### Multiple Posting Times

Post twice daily (10 AM and 6 PM):

```javascript
{
  "scheduling": {
    "postingTimes": [
      { "hour": 10, "minute": 0 },
      { "hour": 18, "minute": 0 }
    ]
  }
}
```

### Platform-Specific Collections

Create separate collections for each platform to optimize content and timing.

## Next Steps

- Explore [API Documentation](./API_DOCUMENTATION.md)
- Check [Development Guide](./DEVELOPMENT.md)
- Read [Quick Start](./QUICKSTART.md)

---

**Need Help?** Open an issue on GitHub or check the troubleshooting section.

**Happy Posting!** 🚀
