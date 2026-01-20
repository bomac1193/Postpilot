# Postpanda API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Authentication Endpoints

### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "email": "john@example.com",
    "name": "John Doe",
    "socialAccounts": {
      "instagram": { "connected": false },
      "tiktok": { "connected": false }
    }
  }
}
```

### Get Current User
```http
GET /auth/me
```
*Requires authentication*

**Response:**
```json
{
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "email": "john@example.com",
    "name": "John Doe",
    "socialAccounts": {
      "instagram": {
        "connected": true,
        "username": "johndoe"
      },
      "tiktok": {
        "connected": false
      }
    }
  }
}
```

### Instagram OAuth
```http
GET /auth/instagram
```
Redirects to Instagram authorization page.

```http
GET /auth/instagram/callback
```
OAuth callback endpoint (configured in Instagram app settings).

### TikTok OAuth
```http
GET /auth/tiktok
```
Redirects to TikTok authorization page.

```http
GET /auth/tiktok/callback
```
OAuth callback endpoint (configured in TikTok app settings).

---

## Content Endpoints

### Upload Content
```http
POST /content
```
*Requires authentication*

**Request:** `multipart/form-data`
- `media`: File (image or video)
- `title`: string (optional)
- `caption`: string (optional)
- `platform`: string ('instagram' | 'tiktok')
- `mediaType`: string ('image' | 'video' | 'carousel')

**Response:**
```json
{
  "message": "Content created successfully",
  "content": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "title": "Summer Vibes",
    "caption": "Enjoying the sunshine!",
    "mediaUrl": "/uploads/media-1234567890.jpg",
    "thumbnailUrl": "/uploads/thumbnails/thumb-1234567890.jpg",
    "platform": "instagram",
    "mediaType": "image",
    "aiScores": {
      "viralityScore": 0,
      "engagementScore": 0,
      "aestheticScore": 0,
      "trendScore": 0,
      "overallScore": 0
    },
    "status": "draft"
  }
}
```

### Get All Content
```http
GET /content?platform=instagram&status=draft&limit=50&offset=0
```
*Requires authentication*

**Query Parameters:**
- `platform`: string (optional) - Filter by platform
- `status`: string (optional) - Filter by status
- `limit`: number (default: 50) - Results per page
- `offset`: number (default: 0) - Pagination offset

**Response:**
```json
{
  "content": [
    {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "title": "Summer Vibes",
      "caption": "Enjoying the sunshine!",
      "mediaUrl": "/uploads/media-1234567890.jpg",
      "aiScores": {
        "overallScore": 85
      }
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

### Get Content by ID
```http
GET /content/:id
```
*Requires authentication*

**Response:**
```json
{
  "content": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "title": "Summer Vibes",
    "caption": "Enjoying the sunshine!",
    "mediaUrl": "/uploads/media-1234567890.jpg",
    "aiScores": {
      "viralityScore": 85,
      "engagementScore": 78,
      "aestheticScore": 92,
      "trendScore": 70,
      "overallScore": 81
    },
    "aiSuggestions": {
      "recommendedType": "post",
      "reason": "Square format is perfect for Instagram feed",
      "bestTimeToPost": "Weekdays 11AM-1PM",
      "hashtagSuggestions": ["summer", "sunshine", "vibes"]
    }
  }
}
```

### Update Content
```http
PUT /content/:id
```
*Requires authentication*

**Request Body:**
```json
{
  "title": "Updated Title",
  "caption": "Updated caption",
  "hashtags": ["tag1", "tag2"],
  "location": "New York, NY",
  "status": "scheduled"
}
```

### Delete Content
```http
DELETE /content/:id
```
*Requires authentication*

### Add Version
```http
POST /content/:id/versions
```
*Requires authentication*

**Request:** `multipart/form-data`
- `media`: File
- `versionName`: string
- `caption`: string (optional)

### Select Version
```http
PUT /content/:id/versions/:versionId/select
```
*Requires authentication*

---

## Grid Endpoints

### Create Grid
```http
POST /grid
```
*Requires authentication*

**Request Body:**
```json
{
  "name": "Summer Campaign",
  "platform": "instagram",
  "columns": 3,
  "totalRows": 3
}
```

**Response:**
```json
{
  "message": "Grid created successfully",
  "grid": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "Summer Campaign",
    "platform": "instagram",
    "columns": 3,
    "totalRows": 3,
    "cells": [
      {
        "position": { "row": 0, "col": 0 },
        "isEmpty": true
      }
      // ... more cells
    ]
  }
}
```

### Get All Grids
```http
GET /grid
```
*Requires authentication*

**Response:**
```json
{
  "grids": [
    {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "name": "Summer Campaign",
      "platform": "instagram",
      "columns": 3,
      "totalRows": 3,
      "cells": []
    }
  ]
}
```

### Get Grid by ID
```http
GET /grid/:id
```
*Requires authentication*

### Update Grid
```http
PUT /grid/:id
```
*Requires authentication*

**Request Body:**
```json
{
  "name": "Updated Grid Name",
  "platform": "instagram",
  "columns": 4
}
```

### Add Row
```http
POST /grid/:id/add-row
```
*Requires authentication*

**Response:**
```json
{
  "message": "Row added successfully",
  "grid": { /* updated grid */ }
}
```

### Remove Row
```http
POST /grid/:id/remove-row
```
*Requires authentication*

### Add Content to Grid
```http
POST /grid/:id/add-content
```
*Requires authentication*

**Request Body:**
```json
{
  "contentId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "row": 0,
  "col": 1
}
```

### Remove Content from Grid
```http
POST /grid/:id/remove-content
```
*Requires authentication*

**Request Body:**
```json
{
  "row": 0,
  "col": 1
}
```

### Reorder Content
```http
POST /grid/:id/reorder
```
*Requires authentication*

**Request Body:**
```json
{
  "moves": [
    {
      "from": { "row": 0, "col": 0 },
      "to": { "row": 0, "col": 1 }
    }
  ]
}
```

### Get Grid Preview
```http
GET /grid/:id/preview
```
*Requires authentication*

---

## AI Endpoints

### Analyze Content
```http
POST /ai/analyze
```
*Requires authentication*

**Request Body:**
```json
{
  "contentId": "60f7b3b3b3b3b3b3b3b3b3b3"
}
```

**Response:**
```json
{
  "message": "Content analyzed successfully",
  "aiScores": {
    "viralityScore": 85,
    "engagementScore": 78,
    "aestheticScore": 92,
    "trendScore": 70,
    "overallScore": 81,
    "analyzedAt": "2024-01-01T12:00:00.000Z"
  },
  "aiSuggestions": {
    "recommendedType": "post",
    "reason": "Square format is perfect for Instagram feed",
    "improvements": [
      "Add 5-15 relevant hashtags",
      "Post during peak hours"
    ],
    "bestTimeToPost": "Weekdays 11AM-1PM",
    "hashtagSuggestions": ["summer", "sunshine"],
    "confidenceScore": 85
  }
}
```

### Compare Versions
```http
POST /ai/compare-versions
```
*Requires authentication*

**Request Body:**
```json
{
  "contentId": "60f7b3b3b3b3b3b3b3b3b3b3"
}
```

**Response:**
```json
{
  "message": "Versions compared successfully",
  "versionAnalysis": [
    {
      "versionName": "Version 1",
      "scores": {
        "viralityScore": 85,
        "engagementScore": 78,
        "overallScore": 81
      },
      "recommendation": 81
    }
  ],
  "bestVersion": "Version 2",
  "recommendation": "The \"Version 2\" version is predicted to perform best with a score of 87/100"
}
```

### Suggest Content Type
```http
POST /ai/suggest-type
```
*Requires authentication*

**Request Body:**
```json
{
  "contentId": "60f7b3b3b3b3b3b3b3b3b3b3"
}
```

**Response:**
```json
{
  "message": "Content type suggestion generated",
  "suggestion": {
    "recommendedType": "reel",
    "reason": "Vertical video format is perfect for Instagram Reels",
    "confidence": 95,
    "alternatives": ["post", "story"]
  }
}
```

### Generate Hashtags
```http
POST /ai/generate-hashtags
```
*Requires authentication*

**Request Body:**
```json
{
  "contentId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "count": 20
}
```

**Response:**
```json
{
  "message": "Hashtags generated successfully",
  "hashtags": [
    "summer",
    "sunshine",
    "vibes",
    "instagood",
    "photooftheday"
  ]
}
```

### Generate Caption
```http
POST /ai/generate-caption
```
*Requires authentication*

**Request Body:**
```json
{
  "contentId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "tone": "casual",
  "length": "medium"
}
```

**Response:**
```json
{
  "message": "Captions generated successfully",
  "captions": [
    "Living for these summer vibes ☀️ What's your favorite season?",
    "Sunshine and good times 🌞 Drop a ☀️ if you love summer!",
    "Summer state of mind 🏖️ Who else is ready for endless sunny days?"
  ]
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid data)
- `401` - Unauthorized (authentication required)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

API requests are limited to 100 requests per 15 minutes per IP address.

When rate limited:
```json
{
  "error": "Too many requests, please try again later"
}
```

---

## Notes

1. All timestamps are in ISO 8601 format (UTC)
2. File uploads support images (JPEG, PNG, GIF, WebP) and videos (MP4, MOV, AVI, WebM)
3. Maximum file size: 100MB
4. AI features require OpenAI API key configuration
5. Social media OAuth requires platform-specific app credentials
