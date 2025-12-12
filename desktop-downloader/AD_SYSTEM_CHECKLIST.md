# 🎯 AD SYSTEM IMPLEMENTATION CHECKLIST

**Goal**: FREE tier with real AdMob ads (₹0.80/ad) + PRO tier (₹249/month, no ads)

---

## ✅ PHASE 1: CORE INFRASTRUCTURE (COMPLETED)

### Backend (Rust + Tauri)
- [x] **Ad Manager Module** (`src-tauri/src/ad_manager.rs`)
  - Token lifecycle management
  - Server communication
  - HWID binding
  
- [x] **Tauri Commands** (`src-tauri/src/main.rs`)
  - `check_ad_required()` - Always returns true for FREE tier
  - `request_download_token()` - Async token request
  - `authorize_download()` - Server validation
  
- [x] **URL Decryption** (`src-tauri/src/security.rs`)
  - Fixed XOR key to 0x1f (static)
  - Proper URL decryption for API endpoints

### Frontend (JavaScript)
- [x] **Ad Popup UI** (`src/renderer/adPopup.js` - 537 lines)
  - Professional Terabox-style popup
  - Video preview (thumbnail, title, duration, platform)
  - Countdown timer with circular progress
  - Glass morphism design
  - Error handling with retry
  
- [x] **Download Blocking** (`src/index.js`)
  - Ad check before every download
  - Three-layer security:
    1. No token → BLOCK
    2. Server rejects → BLOCK  
    3. Error → BLOCK
  - Token storage and clearing

### Server API (Cloudflare Workers)
- [x] **Ad Verification Endpoint** (`/api/v1/ads/verify`)
  - Simple token generation
  - JSON response with token
  
- [x] **Authorization Endpoint** (`/api/v1/download/authorize`)
  - Token format validation
  - Bearer auth support
  
- [x] **Routes Integration** (`server-api/src/worker.js`)
  - Ad routes added to main worker
  - CORS headers handled
  
- [x] **Database Schema** (`server-api/schema-ads.sql`)
  - Tables created in D1 database:
    - `ad_completions`
    - `ad_server_verifications`
    - `ad_rate_limits`

---

## 🔄 PHASE 2: CURRENT STATE (90% COMPLETE)

### What's Working NOW
✅ **Ad popup appears** before download  
✅ **Token received** from server  
✅ **Download blocks** if ad fails  
✅ **3-second countdown** (dev mode)  
✅ **Professional UI** with video preview  
✅ **Server endpoints** deployed and responding  

### What's NOT Working YET
❌ **Real 30-second AdMob ads** (currently just countdown)  
❌ **Revenue tracking** (no AdMob integration)  
❌ **Database logging** (simplified version deployed)  
❌ **Rate limiting** (20 ads/day limit disabled)  
❌ **Server-side callbacks** from AdMob  

---

## 🚀 PHASE 3: REAL ADS INTEGRATION (NEXT STEPS)

### Step 1: AdMob Setup (30 mins)
- [ ] **Create AdMob Account**
  - Go to https://admob.google.com
  - Sign up with Google account
  - Wait 24-48 hours for approval
  
- [ ] **Create Ad Unit**
  - Type: Rewarded Video Ad
  - Platform: Desktop App
  - Copy Ad Unit ID: `ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY`
  
- [ ] **Get App ID**
  - Create app in AdMob
  - Copy App ID: `ca-app-pub-XXXXXXXXXXXXXXXX~ZZZZZZZZZZ`

### Step 2: AdMob SDK Integration (2 hours)
**File: `src/services/admob.ts` (NEW FILE)**
```typescript
// AdMob Rewarded Video Integration
import { invoke } from '@tauri-apps/api/tauri';

const ADMOB_CONFIG = {
  appId: 'ca-app-pub-5562011235764985~XXXXXXXXX', // Replace from AdMob
  adUnitId: 'ca-app-pub-5562011235764985/7189957742', // Your unit
  testMode: false // Set true for testing
};

export async function loadRewardedAd(): Promise<string> {
  return await invoke('load_rewarded_ad', { 
    adUnitId: ADMOB_CONFIG.adUnitId,
    testMode: ADMOB_CONFIG.testMode
  });
}

export async function showRewardedAd(): Promise<boolean> {
  return await invoke('show_rewarded_ad');
}
```

**File: `src-tauri/Cargo.toml` (ADD)**
```toml
[dependencies]
google-ads-rs = "0.1.0"  # AdMob SDK for Rust
```

**File: `src-tauri/src/admob_native.rs` (NEW FILE - 200 lines)**
```rust
// Native AdMob integration
use google_ads_rs::{RewardedAd, AdLoadCallback, AdRewardCallback};

#[tauri::command]
pub async fn load_rewarded_ad(ad_unit_id: String, test_mode: bool) -> Result<String, String> {
    // Load ad from AdMob servers
    // Return ad ID when ready
}

#[tauri::command]
pub async fn show_rewarded_ad() -> Result<bool, String> {
    // Show full-screen video ad
    // Return true when user completes watching
}
```

### Step 3: Update Ad Popup (1 hour)
**File: `src/renderer/adPopup.js` (MODIFY)**
```javascript
// Replace countdown with real ad
async function playRealAd() {
  try {
    // Load ad from AdMob
    const adId = await window.__TAURI__.invoke('load_rewarded_ad', {
      adUnitId: 'ca-app-pub-5562011235764985/7189957742',
      testMode: false
    });
    
    // Show ad (blocks until user watches 30 seconds)
    const completed = await window.__TAURI__.invoke('show_rewarded_ad');
    
    if (completed) {
      // User watched full ad → request token
      return await requestTokenFromServer();
    } else {
      throw new Error('Ad not completed');
    }
  } catch (error) {
    throw new Error(`Ad failed: ${error}`);
  }
}
```

### Step 4: Server-Side Validation (2 hours)
**File: `server-api/src/ads.js` (RESTORE FULL VERSION)**
```javascript
export async function handleAdVerification(request, env) {
  const { hwid, ad_event, timestamp, admob_token } = await request.json();
  
  // 1. Verify with AdMob servers (server-to-server)
  const admobVerified = await verifyWithAdMob(admob_token, env.ADMOB_SECRET);
  if (!admobVerified) {
    return jsonResponse({ error: 'AdMob verification failed' }, 403);
  }
  
  // 2. Rate limiting (20 ads/day)
  const recentAds = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM ad_completions WHERE hwid = ? AND completed_at > ?'
  ).bind(hwid, Date.now() - 86400000).first();
  
  if (recentAds.count >= 20) {
    return jsonResponse({ error: 'Rate limit: 20 ads/day' }, 429);
  }
  
  // 3. Generate secure token
  const token = signToken({ hwid, timestamp, type: 'download', uses: 1 });
  
  // 4. Store in database
  await env.DB.prepare(
    'INSERT INTO ad_completions (hwid, ad_id, completed_at, token, token_used, reward_amount) VALUES (?, ?, ?, ?, 0, ?)'
  ).bind(hwid, admob_token, Date.now(), token, 0.80).run();
  
  return jsonResponse({ success: true, token, expires_in: 60 });
}
```

### Step 5: AdMob Callbacks (1 hour)
**Webhook URL**: `https://wh404-license-api.guitarguitarabhijit.workers.dev/api/v1/ads/callback`

Configure in AdMob dashboard:
- Enable server-to-server callbacks
- Provide webhook URL
- Set HMAC secret in Cloudflare Workers env vars

---

## 📊 PHASE 4: ANALYTICS & MONITORING

### Revenue Dashboard (Optional)
- [ ] Track ad impressions in D1 database
- [ ] Calculate daily revenue (impressions × ₹0.80)
- [ ] Monitor completion rate (completed/started)
- [ ] Detect fraud patterns (too many ads from one HWID)

### Cloudflare Analytics
- [ ] View requests to `/api/v1/ads/verify`
- [ ] Monitor response times
- [ ] Check error rates

---

## 🎮 PHASE 5: PRODUCTION DEPLOYMENT

### Pre-Launch Checklist
- [ ] Change `testMode: false` in admob.ts
- [ ] Update ADMOB_SECRET in Cloudflare Workers
- [ ] Enable AdMob callbacks
- [ ] Test with 5-10 real users
- [ ] Monitor first 24 hours closely

### Launch Day
- [ ] Push signed binary (SignPath certificate)
- [ ] Deploy to GitHub releases
- [ ] Monitor AdMob dashboard for impressions
- [ ] Check revenue tracking in database

---

## 💰 REVENUE ESTIMATION

### Conservative (100 users/day)
- Users: 100
- Downloads per user: 5
- Total ads: 500/day
- Revenue: 500 × ₹0.80 = **₹400/day** = **₹12,000/month**

### Moderate (500 users/day)
- Users: 500  
- Downloads per user: 5
- Total ads: 2,500/day
- Revenue: 2,500 × ₹0.80 = **₹2,000/day** = **₹60,000/month**

### Optimistic (1000 users/day)
- Users: 1,000
- Downloads per user: 10
- Total ads: 10,000/day
- Revenue: 10,000 × ₹0.80 = **₹8,000/day** = **₹2,40,000/month**

---

## 🔥 CURRENT STATUS SUMMARY

**WORKING NOW (Dev Mode)**:
- ✅ Ad popup system
- ✅ Download blocking
- ✅ Token generation
- ✅ Server validation
- ✅ Professional UI

**NEEDS AdMob INTEGRATION**:
- ❌ Real 30-second video ads
- ❌ Revenue tracking
- ❌ AdMob server callbacks
- ❌ Production deployment

**ESTIMATED TIME TO FULL PRODUCTION**: 6-8 hours of focused work

---

## 📝 NEXT IMMEDIATE ACTIONS

1. **Create AdMob Account** (now - wait 24-48 hours for approval)
2. **Test current system** (works with 3-second countdown)
3. **Install AdMob SDK** (when account approved)
4. **Integrate real ads** (replace countdown with video)
5. **Deploy and monitor** (check revenue in dashboard)

---

**Last Updated**: December 13, 2025  
**Status**: Core system working, AdMob integration pending  
**Blocking**: AdMob account approval (24-48 hours)
