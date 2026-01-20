# Postpanda Quick Start Guide

Get up and running with Postpanda in 5 minutes!

## Step 1: Install Dependencies

```bash
cd postpanda
npm install
```

## Step 2: Set Up Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit the file with your favorite editor
nano .env  # or code .env, vim .env, etc.
```

### Minimum Required Configuration

For basic functionality, you only need to set these in your `.env` file:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/postpanda
SESSION_SECRET=any-random-string-here
JWT_SECRET=another-random-string-here
```

### Optional (But Recommended) - OpenAI API

For AI features to work properly, add:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

Get your API key from: https://platform.openai.com/api-keys

*Note: Without this, AI features will use fallback heuristic scoring.*

## Step 3: Start MongoDB

### Option A: If MongoDB is installed locally
```bash
# Start MongoDB service
sudo systemctl start mongod

# Verify it's running
sudo systemctl status mongod
```

### Option B: Using Docker
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Option C: Use MongoDB Atlas (Cloud)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a cluster
4. Get your connection string
5. Update `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/postpanda
```

## Step 4: Start the Server

```bash
# Development mode (auto-restart on changes)
npm run dev

# OR Production mode
npm start
```

You should see:
```
✅ MongoDB Connected Successfully
📊 Database: postpanda

╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     ✈️  Postpanda - AI Content Planner Started       ║
║                                                       ║
║     🌐 Server: http://localhost:3000                 ║
║     📊 API: http://localhost:3000/api              ║
║     ❤️  Health: http://localhost:3000/api/health     ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

## Step 5: Open Your Browser

Navigate to:
```
http://localhost:3000
```

## Step 6: Create an Account

1. Click "Sign up"
2. Enter your name, email, and password
3. Click "Sign Up"

You're in! 🎉

## First Steps

### 1. Upload Your First Content
- Click "Upload Content" button
- Select an image or video
- Add a title and caption
- Click "Upload & Analyze"
- Wait for AI analysis to complete

### 2. Create Your First Grid
- Go to "Grid Planner" tab
- Click "+ New Grid"
- Enter a name (e.g., "My Instagram Feed")
- Click on empty cells to add content

### 3. View AI Insights
- Click on any uploaded content
- See AI scores (Virality, Engagement, Aesthetic, Trend)
- Read AI recommendations
- Get hashtag suggestions

## Common Issues & Solutions

### "MongoDB Connection Error"
```bash
# Make sure MongoDB is running
sudo systemctl start mongod

# Or check if it's installed
mongod --version
```

### "Port 3000 already in use"
Change the port in `.env`:
```env
PORT=3001
```

### "Cannot upload files"
Make sure the uploads directory exists:
```bash
mkdir -p uploads/thumbnails
```

### "AI features not working"
1. Check if `OPENAI_API_KEY` is set in `.env`
2. Verify the API key is valid at https://platform.openai.com
3. Make sure you have credits in your OpenAI account
4. Restart the server after adding the key

## Testing the API

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Next Steps

1. **Connect Social Media Accounts** (Optional)
   - Get Instagram API credentials from Facebook Developers
   - Get TikTok API credentials from TikTok Developers
   - Add them to `.env`
   - Click "Connect Accounts" in the app

2. **Customize Your Experience**
   - Explore different grid layouts (3x3, 4x4, etc.)
   - Create multiple grids for different campaigns
   - Upload multiple versions of content to compare

3. **Optimize Content**
   - Use AI suggestions to improve your content
   - Test different captions and hashtags
   - Schedule posts for optimal times

## Need Help?

- 📖 Full documentation: See [README.md](README.md)
- 🔌 API documentation: See [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- 🐛 Report issues: Open a GitHub issue
- 💡 Feature requests: Open a GitHub issue

## Development Tips

### Hot Reload
Use `npm run dev` for automatic restart on file changes.

### Debugging
Set environment variable:
```env
NODE_ENV=development
```

### View Logs
All errors and info are logged to console. Check your terminal!

### Database Management

View your data:
```bash
# Connect to MongoDB shell
mongo
use postpanda
db.users.find()
db.contents.find()
db.grids.find()
```

---

**Happy planning! ✈️**

If you find Postpanda useful, consider:
- ⭐ Starring the repo
- 🐛 Reporting bugs
- 💡 Suggesting features
- 🤝 Contributing code
