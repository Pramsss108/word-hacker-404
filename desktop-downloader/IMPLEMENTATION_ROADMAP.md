# 🚀 WH404 Desktop Downloader - Implementation Roadmap

> **Created**: December 10, 2025  
> **Status**: Planning Phase  
> **Current Version**: Pre-release (no monetization yet)

---

## 📍 **WHERE WE ARE NOW**

### ✅ **Completed Features**
1. **Core Downloader Functionality**
   - ✅ YouTube video downloads working
   - ✅ Quality selection (144p to 8K)
   - ✅ Audio extraction (MP3, M4A)
   - ✅ Metadata display (title, channel, views)
   - ✅ Progress tracking
   - ✅ Multiple format support
   - ✅ Thumbnail preview

2. **Desktop App Structure**
   - ✅ Tauri + React setup complete
   - ✅ Windows executable building
   - ✅ Modern UI with glass effects
   - ✅ Clean architecture (Rust backend + JS frontend)

3. **Documentation**
   - ✅ SECURITY_MONETIZATION_GUIDE.md (complete strategy)
   - ✅ Architecture documentation
   - ✅ Build and deployment guides

### ❌ **NOT YET IMPLEMENTED**
- ❌ License system (no validation)
- ❌ Download limits (currently unlimited for all users)
- ❌ Payment integration (no Stripe/PayPal)
- ❌ Backend API server (no server at all)
- ❌ Database for licenses (no MongoDB)
- ❌ Hardware ID binding
- ❌ Code obfuscation
- ❌ Code signing certificate
- ❌ Premium features gating
- ❌ Upgrade prompts/modals

**Current State**: Fully functional downloader with NO monetization or security protection.

---

## 🎯 **IMPLEMENTATION PHASES**

### **PHASE 1: Basic License System (Week 1-2)** 🔴 START HERE

#### **Objective**: Get basic license validation working without payment

#### **Tasks**:

**1.1 Backend API Setup (3-4 days)**
- [ ] **Day 1**: Create Node.js + Express project
  - Initialize `server/` directory
  - Install dependencies: `express`, `mongoose`, `dotenv`, `cors`
  - Set up basic Express server with CORS
  - Create `/health` endpoint for testing
  
- [ ] **Day 2**: Set up MongoDB
  - Create MongoDB Atlas account (free tier)
  - Create database: `wh404_licenses`
  - Create License schema (models/License.js)
  - Create Usage schema (models/Usage.js)
  - Test database connection
  
- [ ] **Day 3**: Implement license endpoints
  - POST `/api/license/free` - Generate free tier license
  - POST `/api/license/validate` - Validate license + hardware ID
  - POST `/api/license/usage` - Record download usage
  - GET `/api/license/remaining` - Check remaining downloads
  
- [ ] **Day 4**: Deploy backend
  - Deploy to Railway.app or Render.com (free tier)
  - Set environment variables (MONGO_URI, JWT_SECRET)
  - Test all endpoints with Postman
  - Get production API URL

**1.2 Hardware ID Generation (1 day)**
- [ ] Add Rust dependencies to `src-tauri/Cargo.toml`:
  ```toml
  sha2 = "0.10"
  sysinfo = "0.30"
  ```
- [ ] Implement `get_hardware_id()` Tauri command in `src-tauri/src/main.rs`
- [ ] Test hardware ID generation on Windows
- [ ] Verify same hardware ID on subsequent runs

**1.3 Client License Manager (2-3 days)**
- [ ] **Day 1**: Create license manager service
  - File: `src/services/licenseManager.js`
  - Implement `initialize()`, `validateLicense()`, `canDownload()`
  - Add API URL configuration
  
- [ ] **Day 2**: Integrate with download flow
  - Check `canDownload()` before starting download
  - Call `recordDownload()` after successful download
  - Update UI with remaining downloads
  
- [ ] **Day 3**: Add download counter UI
  - Show "X/3 downloads remaining today" in header
  - Update counter after each download
  - Show "Limit reached" message when 0 remaining

**1.4 Secure Storage (1 day)**
- [ ] Implement secure storage in Rust (Windows Registry)
- [ ] Add `secure_set()` and `secure_get()` Tauri commands
- [ ] Store license key securely
- [ ] Test data persistence across app restarts

**1.5 Testing (1 day)**
- [ ] Test free tier activation on first launch
- [ ] Test download counter (3 downloads max)
- [ ] Test daily reset (downloads reset at midnight)
- [ ] Test license validation failure handling
- [ ] Test offline mode (should allow grace period)

**Deliverable**: Working app with 3 downloads/day limit, no payment yet.

---

### **PHASE 2: Payment Integration (Week 3-4)** 🟡 NEXT

#### **Objective**: Allow users to purchase premium licenses

#### **Tasks**:

**2.1 Stripe Setup (1 day)**
- [ ] Create Stripe account (business mode)
- [ ] Create 3 products:
  - Monthly subscription ($4.99/month)
  - Yearly subscription ($39.99/year)
  - Lifetime license ($99.99 one-time)
- [ ] Get API keys (publishable + secret)
- [ ] Set up webhook endpoint

**2.2 Checkout Page (2 days)**
- [ ] Create simple checkout webpage (HTML + JS)
- [ ] Host on Cloudflare Pages or Vercel (free)
- [ ] Accept `?plan=monthly&hwid=xxx` URL parameters
- [ ] Integrate Stripe Checkout
- [ ] Redirect to success page with license key

**2.3 Webhook Handler (1 day)**
- [ ] Implement `/webhooks/stripe` endpoint
- [ ] Verify webhook signature
- [ ] Generate license key on successful payment
- [ ] Save license to database
- [ ] Send email with license key (use SendGrid free tier)

**2.4 License Activation in App (2 days)**
- [ ] Add "Activate License" button in settings
- [ ] Create license input modal/dialog
- [ ] Validate license with backend
- [ ] Store premium license securely
- [ ] Update UI to show premium status

**2.5 Premium Features Gating (2 days)**
- [ ] Create feature flags object in license manager
- [ ] Disable batch downloads for free users
- [ ] Disable trim tool for free users
- [ ] Disable thumbnail downloads for free users
- [ ] Limit quality to 720p for free users
- [ ] Limit audio quality to 128kbps for free users

**2.6 Upgrade Prompts (1 day)**
- [ ] Create upgrade modal component
- [ ] Show when user hits daily limit
- [ ] Show when user clicks premium-only features
- [ ] Add "Upgrade to Premium" button → opens checkout
- [ ] Pass hardware ID to checkout page

**Deliverable**: Fully monetized app with working payment flow.

---

### **PHASE 3: Security Hardening (Week 5)** 🟢 THEN

#### **Objective**: Protect against piracy and tampering

#### **Tasks**:

**3.1 Code Obfuscation (1 day)**
- [ ] Install `javascript-obfuscator` package
- [ ] Create `scripts/obfuscate.js`
- [ ] Update build script: `npm run build:protected`
- [ ] Test obfuscated app works correctly
- [ ] Verify code is unreadable in production build

**3.2 Binary Protection (1 day)**
- [ ] Update Cargo.toml with release optimizations
- [ ] Enable LTO, strip symbols, optimize for size
- [ ] Add integrity check Tauri command
- [ ] Test app startup time not affected

**3.3 Rate Limiting (1 day)**
- [ ] Install `express-rate-limit` and Redis
- [ ] Add rate limiter middleware to API routes
- [ ] Limit validation endpoint to 100 requests/hour per IP
- [ ] Test rate limiting works
- [ ] Add IP blocking for suspicious activity

**3.4 Anti-Tamper Measures (1 day)**
- [ ] Add build date check (force update after 60 days)
- [ ] Add online activation requirement (first run)
- [ ] Add debugger detection
- [ ] Add code integrity checks

**3.5 HTTPS Certificate Pinning (1 day)**
- [ ] Get API server SSL certificate
- [ ] Implement certificate pinning in Rust
- [ ] Test HTTPS connection works
- [ ] Verify pinning blocks MITM attacks

**Deliverable**: Hardened app resistant to piracy.

---

### **PHASE 4: Code Signing & Distribution (Week 6)** 🔵 FINALLY

#### **Objective**: Professional distribution without Windows warnings

#### **Tasks**:

**4.1 Get Code Signing Certificate (1-2 days)**
- [ ] Purchase certificate from DigiCert or Sectigo (~$200-400/year)
- [ ] Complete identity verification
- [ ] Download certificate (.pfx file)
- [ ] Install certificate on build machine

**4.2 Sign Installers (1 day)**
- [ ] Install SignTool (Windows SDK)
- [ ] Create signing script
- [ ] Sign all .exe files before distribution
- [ ] Test signed installer (no Windows SmartScreen warning)

**4.3 Auto-Update System (2 days)**
- [ ] Implement Tauri updater
- [ ] Create update server endpoint
- [ ] Generate update manifests
- [ ] Test auto-update flow
- [ ] Add "Check for updates" button

**4.4 Distribution Setup (1 day)**
- [ ] Create download page on main website
- [ ] Set up download analytics
- [ ] Create installer changelog
- [ ] Add system requirements page

**Deliverable**: Professionally signed, auto-updating app.

---

## 📊 **TIMELINE SUMMARY**

| Phase | Duration | Cost | Priority |
|-------|----------|------|----------|
| **Phase 1**: Basic License System | 2 weeks | $0 | 🔴 **CRITICAL** |
| **Phase 2**: Payment Integration | 2 weeks | $0* | 🟡 **HIGH** |
| **Phase 3**: Security Hardening | 1 week | $0-15/mo | 🟢 **MEDIUM** |
| **Phase 4**: Code Signing | 1 week | $200-400/yr | 🔵 **LOW** |
| **TOTAL** | **6 weeks** | **$200-400 upfront + $15/mo** | |

*Stripe has no monthly fees, only 2.9% + $0.30 per transaction

---

## 💰 **COST BREAKDOWN**

### **One-Time Costs**
- Code signing certificate: $200-400/year
- Domain (if needed): $10-15/year
- **Total upfront**: ~$210-415

### **Monthly Costs**
- Backend hosting (Railway/Render): $0-5/month (free tier OK initially)
- MongoDB Atlas: $0/month (free tier: 512MB)
- Redis Cloud: $0/month (free tier: 30MB)
- Email service (SendGrid): $0/month (free tier: 100 emails/day)
- **Total monthly**: $0-5/month initially

### **Break-Even Analysis**
- Need to sell: **2-3 monthly subscriptions** OR **1 lifetime license** to break even
- After that: pure profit

---

## 🎯 **RECOMMENDED START**

### **THIS WEEK (December 10-16, 2025)**

**Priority 1: Backend API** (Start immediately)
```bash
# Step 1: Create server directory
mkdir server
cd server
npm init -y

# Step 2: Install dependencies
npm install express mongoose dotenv cors body-parser

# Step 3: Create basic structure
mkdir models routes middleware
touch server.js
```

**Priority 2: MongoDB Setup** (Day 2)
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create cluster (M0 Free tier)
4. Get connection string
5. Test connection

**Priority 3: License Validation Endpoints** (Day 3-4)
- Implement the endpoints from SECURITY_MONETIZATION_GUIDE.md
- Test with Postman/curl
- Deploy to Railway.app (free)

### **NEXT WEEK (December 17-23, 2025)**

**Priority 4: Client Integration**
- Add hardware ID generation (Rust)
- Create license manager (JavaScript)
- Integrate with download flow
- Add UI for download counter

**Priority 5: Testing**
- Test full flow end-to-end
- Verify 3 downloads/day limit works
- Test daily reset
- Fix any bugs

---

## 📝 **DEVELOPMENT CHECKLIST**

Copy this to track progress:

```markdown
## Phase 1: Basic License System
- [ ] 1.1 Backend API Setup
  - [ ] Create Node.js project
  - [ ] Set up MongoDB
  - [ ] Implement license endpoints
  - [ ] Deploy to Railway/Render
- [ ] 1.2 Hardware ID Generation
- [ ] 1.3 Client License Manager
- [ ] 1.4 Secure Storage
- [ ] 1.5 Testing

## Phase 2: Payment Integration
- [ ] 2.1 Stripe Setup
- [ ] 2.2 Checkout Page
- [ ] 2.3 Webhook Handler
- [ ] 2.4 License Activation in App
- [ ] 2.5 Premium Features Gating
- [ ] 2.6 Upgrade Prompts

## Phase 3: Security Hardening
- [ ] 3.1 Code Obfuscation
- [ ] 3.2 Binary Protection
- [ ] 3.3 Rate Limiting
- [ ] 3.4 Anti-Tamper Measures
- [ ] 3.5 HTTPS Certificate Pinning

## Phase 4: Code Signing & Distribution
- [ ] 4.1 Get Code Signing Certificate
- [ ] 4.2 Sign Installers
- [ ] 4.3 Auto-Update System
- [ ] 4.4 Distribution Setup
```

---

## 🚨 **IMPORTANT NOTES**

### **DO NOT Skip Phase 1**
- Phase 1 is the foundation for everything else
- Without license system, you cannot monetize
- Start with backend API setup

### **Test Thoroughly**
- Test each phase before moving to next
- Use Postman to test API endpoints
- Test on real Windows machine, not just dev

### **Start Small**
- Use FREE tiers for everything initially
- MongoDB Atlas free tier: good for 1000s of users
- Railway.app free tier: good for low traffic
- Upgrade only when you hit limits

### **Legal Requirements**
- Add Terms of Service before accepting payments
- Add Privacy Policy (required by Stripe)
- Add Refund Policy (30-day money-back)
- Use Stripe's hosted checkout for PCI compliance

---

## 📞 **NEXT STEPS (ACTION ITEMS)**

### **TODAY (December 10, 2025)**
1. ✅ Read this entire roadmap
2. ⏳ Decide: Start with Phase 1? (Recommended: YES)
3. ⏳ Create MongoDB Atlas account
4. ⏳ Create GitHub repo for backend API
5. ⏳ Start backend project setup

### **THIS WEEK**
- Complete Phase 1.1 (Backend API Setup)
- Get MongoDB working
- Deploy first version of API
- Test license validation

### **WEEK 2**
- Complete Phase 1 (rest of tasks)
- Have working license system
- Test 3 downloads/day limit

### **WEEK 3-4**
- Add payment integration
- First paid user! 🎉

---

**Questions? Start with Phase 1, Task 1.1 - Backend API Setup.**

**Last Updated**: December 10, 2025  
**Status**: Ready to start Phase 1  
**Target Launch**: January 21, 2025 (6 weeks from today)
