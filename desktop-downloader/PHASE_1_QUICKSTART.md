# 🚀 Phase 1 Quick Start Guide - Backend API Setup

> **Goal**: Get license validation API working in 3-4 days  
> **Current Date**: December 10, 2025  
> **No coding experience needed** - Follow step by step

---

## 📋 **BEFORE YOU START**

### **What You Need**
- ✅ Internet connection
- ✅ Text editor (VS Code recommended)
- ✅ Node.js installed (https://nodejs.org - download LTS version)
- ✅ Git installed (https://git-scm.com/downloads)
- ✅ Email address (for MongoDB account)

### **Time Required**
- Day 1: 2-3 hours (Project setup)
- Day 2: 2-3 hours (Database setup)
- Day 3: 3-4 hours (API endpoints)
- Day 4: 2-3 hours (Deploy + test)

---

## 🎯 **DAY 1: PROJECT SETUP (2-3 hours)**

### **Step 1.1: Create Backend Folder**

Open PowerShell and run:

```powershell
# Navigate to your project
cd "D:\A scret project\Word hacker 404\desktop-downloader"

# Create server directory
mkdir server
cd server
```

### **Step 1.2: Initialize Node.js Project**

```powershell
# Create package.json
npm init -y
```

You should see: `Wrote to package.json`

### **Step 1.3: Install Required Packages**

```powershell
npm install express mongoose dotenv cors body-parser nodemon
```

Wait for installation to complete (1-2 minutes).

### **Step 1.4: Create Project Structure**

```powershell
# Create folders
mkdir models
mkdir routes
mkdir middleware

# Create main file
New-Item server.js -ItemType File
New-Item .env -ItemType File
New-Item .gitignore -ItemType File
```

### **Step 1.5: Add .gitignore**

Open `.gitignore` in VS Code and paste:

```
node_modules/
.env
*.log
.DS_Store
```

### **Step 1.6: Create Basic Server**

Open `server.js` and paste:

```javascript
// server.js - Basic Express Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Test endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'WH404 License API is running',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
```

### **Step 1.7: Update package.json Scripts**

Open `package.json` and change the `scripts` section:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

### **Step 1.8: Test the Server**

```powershell
npm run dev
```

You should see:
```
✅ Server running on http://localhost:3000
📊 Health check: http://localhost:3000/health
```

Open browser and go to: `http://localhost:3000/health`

You should see:
```json
{
  "status": "online",
  "message": "WH404 License API is running",
  "timestamp": "2025-12-10T..."
}
```

**✅ DAY 1 COMPLETE!** Press `Ctrl+C` in PowerShell to stop server.

---

## 🗄️ **DAY 2: DATABASE SETUP (2-3 hours)**

### **Step 2.1: Create MongoDB Atlas Account**

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up with your email
3. Choose **FREE tier** (M0 Sandbox)
4. Select cloud provider: **AWS**
5. Select region: **Choose closest to you** (e.g., US East)
6. Cluster name: `wh404-licenses` (or keep default)
7. Click **Create Cluster** (takes 3-5 minutes)

### **Step 2.2: Configure Database Access**

1. In Atlas dashboard, click **Database Access** (left sidebar)
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Username: `wh404admin`
5. Password: Click **Autogenerate Secure Password** → **COPY IT!** (save in notepad)
6. Database User Privileges: **Read and write to any database**
7. Click **Add User**

### **Step 2.3: Configure Network Access**

1. Click **Network Access** (left sidebar)
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (for development)
4. Click **Confirm**

### **Step 2.4: Get Connection String**

1. Click **Database** (left sidebar)
2. Click **Connect** button on your cluster
3. Choose **Connect your application**
4. Driver: **Node.js**
5. Version: **4.1 or later**
6. Copy the connection string (looks like):
   ```
   mongodb+srv://wh404admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. Replace `<password>` with the password you copied earlier

### **Step 2.5: Add Connection String to .env**

Open `server/.env` and add:

```env
MONGODB_URI=mongodb+srv://wh404admin:YOUR_PASSWORD_HERE@cluster0.xxxxx.mongodb.net/wh404_licenses?retryWrites=true&w=majority
PORT=3000
JWT_SECRET=your-random-secret-key-here-change-in-production
```

Replace:
- `YOUR_PASSWORD_HERE` with your actual password
- `your-random-secret-key-here-change-in-production` with any random string (e.g., `wh404-secret-2025-xyz`)

### **Step 2.6: Create Database Models**

Create `server/models/License.js`:

```javascript
// models/License.js
const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
  key: { 
    type: String, 
    unique: true, 
    required: true,
    index: true 
  },
  email: { 
    type: String 
  },
  tier: { 
    type: String, 
    enum: ['free', 'premium'], 
    default: 'free' 
  },
  status: { 
    type: String, 
    enum: ['active', 'suspended', 'revoked'], 
    default: 'active' 
  },
  hardwareId: { 
    type: String,
    index: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date 
  },
  paymentId: { 
    type: String 
  },
  lastValidated: { 
    type: Date 
  }
});

const usageSchema = new mongoose.Schema({
  licenseKey: { 
    type: String, 
    required: true,
    index: true
  },
  date: { 
    type: Date, 
    required: true,
    index: true
  },
  downloads: { 
    type: Number, 
    default: 0 
  }
});

// Compound index for efficient queries
usageSchema.index({ licenseKey: 1, date: 1 }, { unique: true });

module.exports = {
  License: mongoose.model('License', licenseSchema),
  Usage: mongoose.model('Usage', usageSchema)
};
```

### **Step 2.7: Connect Database to Server**

Update `server/server.js` (add after `require('dotenv').config();`):

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose'); // ADD THIS

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ... rest of the code stays the same
```

### **Step 2.8: Test Database Connection**

```powershell
# Make sure you're in server/ directory
npm run dev
```

You should see:
```
✅ Connected to MongoDB
✅ Server running on http://localhost:3000
```

**✅ DAY 2 COMPLETE!** Database is connected.

---

## 🔧 **DAY 3: API ENDPOINTS (3-4 hours)**

### **Step 3.1: Create Utility Functions**

Create `server/utils/helpers.js`:

```javascript
// utils/helpers.js
const crypto = require('crypto');

/**
 * Generate a random license key
 * Format: XXXX-XXXX-XXXX-XXXX
 */
function generateLicenseKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = 4;
  const segmentLength = 4;
  
  let key = [];
  for (let i = 0; i < segments; i++) {
    let segment = '';
    for (let j = 0; j < segmentLength; j++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    key.push(segment);
  }
  
  return key.join('-');
}

/**
 * Get features based on license tier
 */
function getLicenseFeatures(tier) {
  if (tier === 'premium') {
    return {
      unlimitedDownloads: true,
      batchDownloads: true,
      thumbnailDownload: true,
      trimTool: true,
      highQuality: true,
      allAudioQualities: true,
      prioritySpeed: true
    };
  }
  
  return {
    unlimitedDownloads: false,
    batchDownloads: false,
    thumbnailDownload: false,
    trimTool: false,
    highQuality: false,
    allAudioQualities: false,
    prioritySpeed: false
  };
}

/**
 * Get today's date at midnight (for daily reset)
 */
function getTodayMidnight() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

module.exports = {
  generateLicenseKey,
  getLicenseFeatures,
  getTodayMidnight
};
```

Don't forget to create the utils folder first:
```powershell
mkdir utils
```

### **Step 3.2: Create License Routes**

Create `server/routes/license.js`:

```javascript
// routes/license.js
const express = require('express');
const router = express.Router();
const { License, Usage } = require('../models/License');
const { generateLicenseKey, getLicenseFeatures, getTodayMidnight } = require('../utils/helpers');

/**
 * POST /api/license/free
 * Generate a free tier license for new user
 */
router.post('/free', async (req, res) => {
  try {
    const { hardwareId } = req.body;
    
    if (!hardwareId) {
      return res.status(400).json({ error: 'hardwareId is required' });
    }
    
    // Check if hardware already has a license
    const existingLicense = await License.findOne({ hardwareId });
    
    if (existingLicense) {
      return res.json({
        key: existingLicense.key,
        tier: existingLicense.tier,
        features: getLicenseFeatures(existingLicense.tier),
        message: 'Existing license found'
      });
    }
    
    // Generate new free license
    const licenseKey = generateLicenseKey();
    
    const license = await License.create({
      key: licenseKey,
      tier: 'free',
      hardwareId: hardwareId,
      status: 'active'
    });
    
    res.json({
      key: license.key,
      tier: license.tier,
      features: getLicenseFeatures(license.tier),
      message: 'Free license created'
    });
    
  } catch (error) {
    console.error('Error creating free license:', error);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * POST /api/license/validate
 * Validate license key and check usage limits
 */
router.post('/validate', async (req, res) => {
  try {
    const { licenseKey, hardwareId, appVersion } = req.body;
    
    if (!licenseKey || !hardwareId) {
      return res.status(400).json({ 
        valid: false, 
        reason: 'missing_parameters' 
      });
    }
    
    // Find license
    const license = await License.findOne({ 
      key: licenseKey,
      status: 'active'
    });
    
    if (!license) {
      return res.json({ 
        valid: false, 
        reason: 'invalid_key' 
      });
    }
    
    // Check hardware binding
    if (license.hardwareId && license.hardwareId !== hardwareId) {
      return res.json({ 
        valid: false, 
        reason: 'hardware_mismatch' 
      });
    }
    
    // Check expiration
    if (license.expiresAt && new Date() > license.expiresAt) {
      return res.json({ 
        valid: false, 
        reason: 'expired' 
      });
    }
    
    // Check daily usage limits
    const today = getTodayMidnight();
    const usage = await Usage.findOne({
      licenseKey: licenseKey,
      date: today
    });
    
    const maxDownloads = license.tier === 'free' ? 3 : 999999;
    const currentDownloads = usage ? usage.downloads : 0;
    const remaining = Math.max(0, maxDownloads - currentDownloads);
    
    if (remaining === 0 && license.tier === 'free') {
      return res.json({ 
        valid: true,
        limitReached: true,
        remaining: 0,
        tier: license.tier
      });
    }
    
    // Bind hardware on first validation
    if (!license.hardwareId) {
      license.hardwareId = hardwareId;
      await license.save();
    }
    
    // Update last validated timestamp
    license.lastValidated = new Date();
    await license.save();
    
    // Return success
    res.json({
      valid: true,
      tier: license.tier,
      expiresAt: license.expiresAt,
      features: getLicenseFeatures(license.tier),
      remaining: remaining,
      limitReached: false
    });
    
  } catch (error) {
    console.error('License validation error:', error);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * POST /api/license/usage
 * Record a download usage
 */
router.post('/usage', async (req, res) => {
  try {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({ error: 'licenseKey is required' });
    }
    
    const today = getTodayMidnight();
    
    // Increment or create usage record
    await Usage.findOneAndUpdate(
      { licenseKey, date: today },
      { $inc: { downloads: 1 } },
      { upsert: true, new: true }
    );
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Usage recording error:', error);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * GET /api/license/remaining/:key
 * Get remaining downloads for a license
 */
router.get('/remaining/:key', async (req, res) => {
  try {
    const licenseKey = req.params.key;
    
    const license = await License.findOne({ key: licenseKey });
    
    if (!license) {
      return res.status(404).json({ error: 'license_not_found' });
    }
    
    if (license.tier === 'premium') {
      return res.json({ 
        remaining: 'unlimited',
        tier: 'premium'
      });
    }
    
    const today = getTodayMidnight();
    const usage = await Usage.findOne({ licenseKey, date: today });
    const currentDownloads = usage ? usage.downloads : 0;
    const remaining = Math.max(0, 3 - currentDownloads);
    
    res.json({ 
      remaining,
      tier: 'free',
      maxPerDay: 3
    });
    
  } catch (error) {
    console.error('Error getting remaining:', error);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
```

### **Step 3.3: Add Routes to Server**

Update `server/server.js` (add before `app.listen`):

```javascript
// Import routes
const licenseRoutes = require('./routes/license');

// Use routes
app.use('/api/license', licenseRoutes);

// 404 handler (add before app.listen)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});
```

### **Step 3.4: Test All Endpoints**

Start server:
```powershell
npm run dev
```

**Test 1: Health Check**
Open browser: `http://localhost:3000/health`

**Test 2: Create Free License**
Open PowerShell in new window:
```powershell
curl -X POST http://localhost:3000/api/license/free `
  -H "Content-Type: application/json" `
  -d '{"hardwareId":"test-hardware-123"}'
```

You should get response like:
```json
{
  "key": "ABCD-EF12-GH34-JK56",
  "tier": "free",
  "features": { ... },
  "message": "Free license created"
}
```

**Copy the license key!** You'll need it for next tests.

**Test 3: Validate License**
```powershell
curl -X POST http://localhost:3000/api/license/validate `
  -H "Content-Type: application/json" `
  -d '{"licenseKey":"YOUR-KEY-HERE","hardwareId":"test-hardware-123","appVersion":"1.0.0"}'
```

Replace `YOUR-KEY-HERE` with the key from Test 2.

You should get:
```json
{
  "valid": true,
  "tier": "free",
  "features": { ... },
  "remaining": 3,
  "limitReached": false
}
```

**Test 4: Record Download Usage**
```powershell
curl -X POST http://localhost:3000/api/license/usage `
  -H "Content-Type: application/json" `
  -d '{"licenseKey":"YOUR-KEY-HERE"}'
```

**Test 5: Check Remaining**
```powershell
curl http://localhost:3000/api/license/remaining/YOUR-KEY-HERE
```

Should show: `{ "remaining": 2, "tier": "free", "maxPerDay": 3 }`

**✅ DAY 3 COMPLETE!** All endpoints working.

---

## 🌐 **DAY 4: DEPLOY TO PRODUCTION (2-3 hours)**

### **Step 4.1: Prepare for Deployment**

Create `server/.gitignore` (if not exists):
```
node_modules/
.env
*.log
```

Create `server/README.md`:
```markdown
# WH404 License API Server

## Environment Variables
- MONGODB_URI - MongoDB connection string
- PORT - Server port (default 3000)
- JWT_SECRET - Secret key for JWT tokens

## Endpoints
- GET /health - Health check
- POST /api/license/free - Generate free license
- POST /api/license/validate - Validate license
- POST /api/license/usage - Record download
- GET /api/license/remaining/:key - Check remaining downloads
```

### **Step 4.2: Deploy to Railway.app**

1. Go to: https://railway.app/
2. Click **Start a New Project**
3. Sign in with GitHub
4. Click **Deploy from GitHub repo**
5. Select your repo (or choose "Deploy from local directory")
6. Select `server/` folder if prompted
7. Railway will auto-detect Node.js

### **Step 4.3: Set Environment Variables**

In Railway dashboard:
1. Click your project
2. Go to **Variables** tab
3. Add these variables:
   - `MONGODB_URI` = your MongoDB connection string
   - `PORT` = 3000
   - `JWT_SECRET` = your random secret
4. Click **Deploy**

Wait 2-3 minutes for deployment.

### **Step 4.4: Get Your API URL**

1. In Railway, go to **Settings**
2. Click **Generate Domain**
3. Copy the URL (looks like: `https://your-project.up.railway.app`)
4. Test: Open `https://your-project.up.railway.app/health` in browser

You should see:
```json
{
  "status": "online",
  "message": "WH404 License API is running",
  "timestamp": "..."
}
```

### **Step 4.5: Update Desktop App Config**

In your desktop app, create `src/config.js`:

```javascript
// src/config.js
export const API_URL = 'https://your-project.up.railway.app';
```

Replace with your actual Railway URL.

**✅ DAY 4 COMPLETE!** API is live on the internet.

---

## ✅ **PHASE 1 CHECKLIST**

Copy this and check off as you complete:

```
Day 1: Project Setup
- [ ] Created server/ directory
- [ ] Installed Node.js dependencies
- [ ] Created server.js with basic Express
- [ ] Tested /health endpoint locally

Day 2: Database Setup
- [ ] Created MongoDB Atlas account
- [ ] Created database user
- [ ] Allowed network access
- [ ] Got connection string
- [ ] Created License and Usage models
- [ ] Connected to database successfully

Day 3: API Endpoints
- [ ] Created utility functions
- [ ] Created license routes
- [ ] Tested POST /api/license/free
- [ ] Tested POST /api/license/validate
- [ ] Tested POST /api/license/usage
- [ ] Tested GET /api/license/remaining/:key
- [ ] All tests passing

Day 4: Deployment
- [ ] Prepared for deployment
- [ ] Deployed to Railway.app
- [ ] Set environment variables
- [ ] Got production API URL
- [ ] Tested production /health endpoint
- [ ] Updated desktop app config
```

---

## 🎉 **CONGRATULATIONS!**

You now have a working license validation API!

### **What You Accomplished**
✅ Backend API server running  
✅ MongoDB database connected  
✅ License generation working  
✅ License validation working  
✅ Download limiting working (3/day)  
✅ Deployed to production  

### **What's Next?**
Continue to Phase 1 remaining tasks:
- Add hardware ID generation in Tauri (Rust)
- Create license manager in desktop app (JavaScript)
- Integrate with download flow
- Add UI for download counter

---

## 🆘 **TROUBLESHOOTING**

### **Error: "Cannot connect to MongoDB"**
- Check your `.env` file has correct MONGODB_URI
- Check you replaced `<password>` with actual password
- Check network access is set to "Allow from anywhere"

### **Error: "Port 3000 is already in use"**
- Change PORT in `.env` to 3001 or 3002
- Or stop other process using port 3000

### **Error: "Module not found"**
- Run `npm install` again in server/ directory
- Check you're in correct directory

### **Endpoints not working**
- Check server is running (`npm run dev`)
- Check correct endpoint URL
- Check request body has required fields
- Check server console for error messages

### **Deployment failed**
- Check all files are committed to Git
- Check package.json has correct scripts
- Check environment variables are set in Railway
- Check Railway logs for error messages

---

## 📞 **NEED HELP?**

If stuck, check:
1. Server console for error messages
2. MongoDB Atlas dashboard (is cluster running?)
3. Railway deployment logs
4. Browser developer console (F12)

**Most common issues:**
- Typo in connection string
- Forgot to replace password
- Wrong directory (make sure you're in `server/`)
- Port conflict (change PORT in .env)

---

**Last Updated**: December 10, 2025  
**Status**: Ready to start  
**Estimated Time**: 4 days (2-3 hours per day)

Good luck! 🚀
