# Postpanda v2.0 - Complete Setup Instructions

## 🎉 What's New in v2.0

Postpanda now has **FULL Instagram & TikTok posting** with **automated scheduling** and **drag-and-drop collections**!

## 📋 Quick Start (5 Minutes)

### 1. Start MongoDB

```bash
sudo systemctl start mongod
sudo systemctl status mongod  # Verify it's running
```

### 2. Start Postpanda

```bash
cd /home/sphinxy/postpanda
npm run dev
```

You'll see:
```
✈️  Postpanda - AI Content Planner Started
🌐 Server: http://localhost:3000
🚀 Starting scheduling service...
✅ Scheduling service started
```

### 3. Open Browser

Navigate to: **http://localhost:3000**

### 4. Create Account

1. Click "Sign up"
2. Enter email, password, and name
3. Click "Register"

You're in!

## 🔑 Setting Up Social Media Posting

To enable Instagram and TikTok posting, you need API credentials.

### Instagram Setup (10 minutes)

**Step 1: Create Facebook App**

1. Go to https://developers.facebook.com/apps/
2. Click "Create App"
3. Select type: "Business"
4. Enter app name: "Postpanda" (or your choice)
5. Click "Create App"

**Step 2: Add Instagram Product**

1. In your app dashboard, find "Add Products"
2. Find "Instagram" → Click "Set Up"
3. Go to Instagram → Basic Display
4. Click "Create New App"
5. Fill in display name and save

**Step 3: Get Credentials**

1. Go to Settings → Basic
2. Copy your **App ID** (this is CLIENT_ID)
3. Click "Show" next to **App Secret** (this is CLIENT_SECRET)

**Step 4: Configure Redirect URI**

1. Scroll to "Instagram Basic Display"
2. In "Valid OAuth Redirect URIs" add:
   ```
   http://localhost:3000/api/auth/instagram/callback
   ```
3. Save changes

**Step 5: Update .env**

```bash
nano /home/sphinxy/postpanda/.env
```

Add these lines:
```env
INSTAGRAM_CLIENT_ID=your_app_id_here
INSTAGRAM_CLIENT_SECRET=your_app_secret_here
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback
```

**Step 6: Restart Server**

```bash
# Press Ctrl+C to stop server
npm run dev  # Start again
```

**Step 7: Connect Your Account**

1. In Postpanda, go to Settings
2. Click "Connect Instagram"
3. Login with your Instagram account
4. Click "Authorize"

✅ Instagram Connected!

### TikTok Setup (10 minutes)

**Step 1: Register as TikTok Developer**

1. Go to https://developers.tiktok.com/
2. Click "Register"
3. Sign in with TikTok account
4. Complete developer registration

**Step 2: Create App**

1. Go to "Manage apps"
2. Click "Connect an app"
3. Fill in app details:
   - App name: "Postpanda"
   - Category: Social/Content
4. Add products: "Login Kit" and "Content Posting API"

**Step 3: Get Credentials**

1. In app dashboard, find:
   - **Client Key**
   - **Client Secret**

**Step 4: Configure Redirect**

1. In "Login Kit" settings
2. Add redirect URI:
   ```
   http://localhost:3000/api/auth/tiktok/callback
   ```

**Step 5: Update .env**

```bash
nano /home/sphinxy/postpanda/.env
```

Add:
```env
TIKTOK_CLIENT_KEY=your_client_key_here
TIKTOK_CLIENT_SECRET=your_client_secret_here
TIKTOK_REDIRECT_URI=http://localhost:3000/api/auth/tiktok/callback
```

**Step 6: Restart & Connect**

```bash
# Restart server
npm run dev

# In Postpanda UI:
# Settings → Connect TikTok → Authorize
```

✅ TikTok Connected!

## 🎨 Using Collections

### Create Your First Collection

1. **Go to Collections Tab**
2. **Click "+ New Collection"**
3. Fill in:
   - Name: "December Campaign"
   - Description: "Holiday posts"
   - Platform: Instagram
   - Grid: 3 columns × 5 rows
4. **Click "Create Collection"**

### Add Content to Collection

**Option 1: Drag and Drop (Recommended)**

1. Open your collection
2. You'll see:
   - Grid at top (empty cells)
   - Content library at bottom
3. **Drag** any content item from library
4. **Drop** onto desired grid position
5. Content appears in grid!

**Option 2: API**

```bash
curl -X POST http://localhost:3000/api/collection/COLLECTION_ID/content \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "CONTENT_ID",
    "position": {"row": 0, "col": 0}
  }'
```

### Schedule Auto-Posting

1. **Open Collection**
2. **Click "📅 Schedule"**
3. Configure:
   - ✅ Enable Scheduling
   - Start Date: Tomorrow 10:00 AM
   - Interval: Daily
   - Posting Time: 10:00
   - ✅ Enable Auto-Posting
4. **Click "Save Schedule"**

🎉 Your collection will now post automatically every day at 10 AM!

### Manual Posting

To post immediately:

1. Open collection
2. Click "🚀 Post Now"
3. Confirms and posts next item

## 📊 Monitoring

### Check Scheduling Status

```bash
curl http://localhost:3000/api/post/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "service": {
    "running": true,
    "checkInterval": "60 seconds"
  },
  "userCollections": {
    "scheduled": 2,
    "active": 3
  }
}
```

### View Collection Progress

In Collections view:
- See posted vs total items
- Check next post time
- View error logs if any

## 🐛 Troubleshooting

### "MongoDB Connection Error"

```bash
sudo systemctl start mongod
sudo systemctl enable mongod  # Auto-start on boot
```

### "Instagram Token Expired"

```bash
curl -X POST http://localhost:3000/api/post/instagram/refresh-token \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Or reconnect in Settings.

### "Media URL not accessible" (Instagram)

Instagram requires publicly accessible URLs. Solutions:

**Option 1: Use ngrok for testing**

```bash
npm install -g ngrok
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Update .env:
FRONTEND_URL=https://abc123.ngrok.io
```

**Option 2: Deploy to server**

Deploy to cloud server with public IP.

### "Video Processing Failed" (TikTok)

- Check video format: Must be MP4
- Check size: Max 72MB
- Check codec: H.264 recommended
- Check duration: 3 seconds - 10 minutes

### Posts Not Auto-Posting

1. Check service status:
   ```bash
   curl http://localhost:3000/api/post/status -H "Authorization: Bearer TOKEN"
   ```

2. Verify:
   - ✅ Collection status is "scheduled"
   - ✅ autoPost is enabled
   - ✅ Social account connected
   - ✅ Next post time is set
   - ✅ Server is running

## 📚 Documentation

- **COLLECTIONS_GUIDE.md** - Complete collections guide
- **DEVELOPMENT.md** - Developer documentation
- **API_DOCUMENTATION.md** - Full API reference
- **CHANGELOG.md** - Version history

## 🎯 What You Can Do Now

✅ Create unlimited collections  
✅ Drag-and-drop content organization  
✅ Schedule automated posting  
✅ Post to Instagram (images & videos)  
✅ Post to TikTok (videos)  
✅ Track posting progress  
✅ Pause/resume schedules  
✅ Duplicate collections  
✅ Monitor errors and status  

## 🚀 Next Steps

1. **Upload Content**
   - Go to Content Library
   - Click Upload
   - Select images/videos
   - AI analyzes automatically

2. **Create Collection**
   - Go to Collections
   - Create new collection
   - Drag content to grid

3. **Schedule Posting**
   - Configure schedule
   - Enable auto-post
   - Watch it work!

## 💡 Pro Tips

- **Test with Draft First**: Create draft collections to test layouts
- **Use Duplicates**: Duplicate successful campaigns
- **Check Scores**: Higher AI scores = better performance
- **Schedule Wisely**: Post during peak engagement times
- **Monitor Errors**: Check collection errors regularly

## 🆘 Need Help?

- Read: `cat COLLECTIONS_GUIDE.md`
- Check logs: Server console shows all activity
- Test API: `curl http://localhost:3000/api/health`

---

**Ready to automate your social media?**  
Start Postpanda and create your first collection! 🚀
