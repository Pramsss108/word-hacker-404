# 🎬 PHASE 3: ADMOB DESKTOP INTEGRATION - IMPLEMENTATION PLAN

**Client:** Word Hacker 404  
**Developer:** Senior Full-Stack Engineer  
**Timeline:** 4 hours  
**Status:** IN PROGRESS  

---

## 📋 IMPLEMENTATION BREAKDOWN

### **Part 1: Ad Infrastructure (30 mins)**
- [x] Database schema deployed
- [x] API endpoints live
- [x] Token system working
- [ ] Desktop app ad manager module

### **Part 2: Video Preview During Ads (1 hour)**
```
User Experience:
┌────────────────────────────────────┐
│ 🎬 Loading your video...          │
├────────────────────────────────────┤
│                                    │
│   [VIDEO THUMBNAIL PREVIEW]        │
│   Title: "Amazing reel..."         │
│   Duration: 0:34                   │
│                                    │
│   ⏳ Please watch this ad first   │
│                                    │
│   [AD PLAYING - 25 seconds left]   │
│                                    │
│   ████████░░ 80% complete          │
│                                    │
└────────────────────────────────────┘
```

### **Part 3: Ad SDK Integration (1.5 hours)**
- Web-based AdMob (Tauri WebView compatible)
- Fullscreen rewarded video
- Skip button after 5 seconds
- Completion callback
- Error handling

### **Part 4: Testing & Polish (1 hour)**
- End-to-end flow test
- Error scenarios
- Performance optimization
- UI/UX refinement

---

## 🎨 USER FLOW (PROFESSIONAL)

### **Step 1: User Initiates Download**
```rust
User pastes URL → Clicks "Download"
  ↓
App checks: Has active download token?
  ↓ NO
Shows beautiful ad popup
```

### **Step 2: Video Preview Loads**
```javascript
While ad loads:
- Fetch video metadata (thumbnail, title, duration)
- Show preview to user
- Display "Watch ad to unlock" message
- Load AdMob ad in background
```

### **Step 3: Ad Experience (30 seconds)**
```
Professional UX:
1. Countdown timer visible (30...29...28...)
2. Video thumbnail remains visible (motivation)
3. "Your download starts after this ad"
4. Skip button after 5 seconds (optional)
5. Smooth progress bar
6. No close button until complete
```

### **Step 4: Ad Completion**
```rust
AdMob fires: onRewardedAdCompleted()
  ↓
App requests token:
POST /api/v1/ads/verify
{ hwid, ad_event: "completed", timestamp }
  ↓
Server validates and returns token
  ↓
App stores token (60 second expiry)
  ↓
UI updates: "✅ Ad complete! Starting download..."
  ↓
Download begins automatically
```

### **Step 5: Download Authorization**
```rust
Before download starts:
POST /api/v1/download/authorize
Headers: { Authorization: "Bearer DL-2025-X7K9..." }
Body: { hwid, url }
  ↓
Server validates token (one-time use)
  ↓
Token marked as USED
  ↓
Download proceeds
```

---

## 🔧 TECHNICAL IMPLEMENTATION

### **File 1: Ad Manager Module**
**Path:** `desktop-downloader/src-tauri/src/ad_manager.rs`

```rust
// Ad Manager - Coordinates ad display and verification
pub struct AdManager {
    hwid: String,
    api_url: String,
    current_token: Option<String>,
    token_expiry: Option<u64>,
}

impl AdManager {
    pub fn new(hwid: String, api_url: String) -> Self {
        AdManager {
            hwid,
            api_url,
            current_token: None,
            token_expiry: None,
        }
    }
    
    pub async fn request_ad_token(&mut self) -> Result<String, String> {
        // POST /api/v1/ads/verify
        // Returns download token
    }
    
    pub fn has_valid_token(&self) -> bool {
        // Check if token exists and not expired
    }
    
    pub fn consume_token(&mut self) -> Option<String> {
        // Return and clear token (one-time use)
    }
}
```

### **File 2: Ad UI Component**
**Path:** `desktop-downloader/src/components/AdRewardedPopup.tsx`

```typescript
interface AdRewardedPopupProps {
  videoMetadata: {
    thumbnail: string;
    title: string;
    duration: string;
  };
  onAdCompleted: (token: string) => void;
  onAdFailed: (error: string) => void;
}

export function AdRewardedPopup(props: AdRewardedPopupProps) {
  const [countdown, setCountdown] = useState(30);
  const [progress, setProgress] = useState(0);
  const [adLoaded, setAdLoaded] = useState(false);
  
  // Load AdMob ad
  useEffect(() => {
    loadRewardedAd();
  }, []);
  
  // Show video preview while ad loads
  return (
    <div className="ad-popup-overlay">
      <div className="ad-popup-content">
        {/* Video Preview */}
        <div className="video-preview">
          <img src={props.videoMetadata.thumbnail} />
          <h3>{props.videoMetadata.title}</h3>
          <span>{props.videoMetadata.duration}</span>
        </div>
        
        {/* Ad Container */}
        <div className="ad-container">
          {adLoaded ? (
            <>
              <div id="admob-ad-slot" />
              <div className="countdown">
                ⏳ {countdown} seconds remaining
              </div>
              <div className="progress-bar">
                <div style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : (
            <div className="loading">Loading ad...</div>
          )}
        </div>
        
        <p className="download-message">
          Your download will start automatically after this ad
        </p>
      </div>
    </div>
  );
}
```

### **File 3: AdMob Integration Service**
**Path:** `desktop-downloader/src/services/admob.ts`

```typescript
const ADMOB_AD_UNIT_ID = 'ca-app-pub-5562011235764985/7189957742';

export class AdMobService {
  private adLoaded = false;
  
  async loadRewardedAd(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Load AdMob SDK
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      script.async = true;
      script.onload = () => {
        this.initializeAd(resolve, reject);
      };
      document.head.appendChild(script);
    });
  }
  
  private initializeAd(resolve, reject) {
    // Configure rewarded ad
    const adConfig = {
      adUnitPath: ADMOB_AD_UNIT_ID,
      adType: 'rewarded',
      timeout: 10000
    };
    
    // Load and display
    // Fire callbacks on completion/failure
  }
  
  async requestAdToken(hwid: string): Promise<string> {
    const response = await fetch(
      'https://wh404-license-api.guitarguitarabhijit.workers.dev/api/v1/ads/verify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hwid,
          ad_event: 'completed',
          timestamp: Date.now()
        })
      }
    );
    
    const data = await response.json();
    return data.token;
  }
}
```

### **File 4: Download Authorization**
**Path:** `desktop-downloader/src-tauri/src/downloader.rs`

```rust
pub async fn authorize_download(
    token: String,
    hwid: String,
    url: String
) -> Result<(), String> {
    let client = reqwest::Client::new();
    
    let response = client
        .post("https://wh404-license-api.guitarguitarabhijit.workers.dev/api/v1/download/authorize")
        .header("Authorization", format!("Bearer {}", token))
        .json(&serde_json::json!({
            "hwid": hwid,
            "url": url
        }))
        .send()
        .await
        .map_err(|e| format!("Authorization failed: {}", e))?;
    
    if !response.status().is_success() {
        return Err("Download not authorized".to_string());
    }
    
    Ok(())
}
```

---

## 🎯 CRACK PREVENTION IN IMPLEMENTATION

### **Prevention 1: Client-Side Bypass**
```rust
// Cracker tries to skip ad popup
// OUR DEFENSE: Server won't issue token without ad completion
if let Some(token) = ad_manager.consume_token() {
    // Use token
} else {
    // Force ad display - no way around it
    show_ad_popup();
    return; // Block download until ad completes
}
```

### **Prevention 2: Fake Token Injection**
```rust
// Cracker tries to inject fake token
// OUR DEFENSE: Server validates signature
let response = authorize_download(token, hwid, url).await;
match response {
    Ok(_) => proceed_download(),
    Err(_) => {
        // Token invalid, show ad again
        ad_manager.clear_token();
        show_ad_popup();
    }
}
```

### **Prevention 3: Token Reuse**
```rust
// Cracker saves token for multiple downloads
// OUR DEFENSE: One-time use enforced by server
// Second attempt returns 403 Forbidden
// App detects and requests new ad view
```

---

## 📊 PROGRESS TRACKING

### **Completed:**
- [x] API endpoints deployed
- [x] Database schema ready
- [x] Token system implemented
- [x] Server-side verification complete

### **In Progress (NOW):**
- [ ] AdManager Rust module (30 mins)
- [ ] Ad UI component (45 mins)
- [ ] AdMob SDK integration (45 mins)
- [ ] Download authorization flow (30 mins)
- [ ] Testing & polish (1 hour)

### **Deliverables:**
1. Fully functional ad-gated downloads
2. Professional UI with video preview
3. Crack-proof token system
4. Error handling & fallbacks
5. Production-ready code

---

## 🚀 DEPLOYMENT STEPS

### **After Code Complete:**
1. Run type-check: `npm run type-check`
2. Build Rust: `cargo build --release`
3. Test locally: Full download flow
4. Git commit: "feat: professional AdMob integration"
5. Git push: Auto-deploys to GitHub
6. Monitor: AdMob dashboard for revenue

### **Go-Live Checklist:**
- [ ] Ad loads within 2 seconds
- [ ] Video preview displays correctly
- [ ] Countdown timer accurate
- [ ] Download starts automatically after ad
- [ ] Error handling works (no ad available)
- [ ] Token expiry respected (60 seconds)
- [ ] Fraud prevention active
- [ ] Revenue tracking enabled

---

## 💰 REVENUE ACTIVATION

**After deployment:**
1. AdMob serves real ads (not test ads)
2. Users watch ads to download
3. You earn ₹0.80 per ad
4. Revenue appears in AdMob dashboard within 24 hours
5. Monthly payment to bank account

**Expected Timeline:**
- **Day 1:** 10 ads = ₹8
- **Week 1:** 500 ads = ₹400
- **Month 1:** 10,000 ads = ₹8,000

---

## 📱 MOBILE OPTIMIZATION

**AdMob automatically optimizes for:**
- Desktop screens (1920x1080)
- Laptop screens (1366x768)
- Tablet screens (if used via web)

**Our UI adapts to:**
- Small windows
- Large monitors
- High DPI displays

---

**STATUS: IMPLEMENTATION STARTING NOW**  
**ETA: 4 hours to production-ready ad system**

---

*This document is the professional development plan. Execution begins immediately.*
