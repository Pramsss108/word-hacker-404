# 🎯 AdSense Setup Guide for Non-Coders

**Why AdSense?** Your desktop app needs desktop ads. AdMob only works for Android/iOS mobile apps. AdSense is Google's platform for desktop/web apps.

**What you'll earn:** ₹0.50 to ₹1.50 per ad view (similar to AdMob)

---

## 📋 STEP 1: CREATE ADSENSE ACCOUNT (15 mins - YOU DO THIS)

### 1.1 Go to AdSense Website
- Open browser: https://www.google.com/adsense
- Click **"Sign Up Now"** button
- Use your Gmail account (same one you used for AdMob is fine)

### 1.2 Fill Application Form
**Country/Territory:** India  
**URL:** Put any website you own, or use: `https://wordhacker404.me`  
**Email:** Your Gmail address  

**Questions they'll ask:**
- "Do you have a website?" → **Yes** (use wordhacker404.me)
- "Is this URL owned by you?" → **Yes**
- "Accept terms" → **Check the box**

### 1.3 Phone Verification
- Google will send SMS code to your phone
- Enter the 6-digit code
- Click "Verify"

### 1.4 Payment Details (DO THIS NOW)
**IMPORTANT:** Fill out payment info immediately:
- **Name:** Your legal name (as on bank account)
- **Address:** Your full address
- **PAN Card:** Required for tax purposes in India
- **Bank Account:** Where you want money deposited

**Payment Threshold:** ₹1,000 (you get paid when you earn this much)

### 1.5 Wait for Approval
- **Time:** 24-48 hours usually
- **Email:** Google will send approval/rejection email
- **Status:** Check at https://www.google.com/adsense/start/

**While waiting:** Continue to Step 2!

---

## 📋 STEP 2: CREATE AD UNIT (5 mins - YOU DO AFTER APPROVAL)

### 2.1 Login to AdSense Dashboard
- Go to: https://www.google.com/adsense
- Click **"Sign In"**
- Should see your dashboard

### 2.2 Create Display Ad Unit
**Navigation:**
1. Click **"Ads"** in left sidebar
2. Click **"By ad unit"** tab
3. Click **"+ New ad unit"**

**Ad Unit Settings:**
- **Name:** `Desktop App Video Ad`
- **Type:** Select **"Display ads"**
- **Size:** Select **"Responsive"**
- **Ad type:** Check **"Text & display ads"** + **"Video ads"**

Click **"Create"**

### 2.3 Copy Your Ad Code
You'll see a code like this:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
     crossorigin="anonymous"></script>
```

**IMPORTANT:** Copy the `ca-pub-XXXXXXXXXXXXXXXX` part (your Publisher ID)

**Example:** `ca-pub-1234567890123456`

### 2.4 Send Me Your Publisher ID
Once you have it, just paste it here. It looks like:
```
ca-pub-1234567890123456
```

---

## 📋 STEP 3: I'LL INTEGRATE ADS (2 hours - I DO THIS)

Once you give me your Publisher ID, I'll do ALL the coding:

### What I'll Do:
1. **Create AdSense module** → Loads ads from Google servers
2. **Replace 3-second countdown** → With real 30-second video ads
3. **Add ad player** → Plays video in the popup
4. **Revenue tracking** → Logs every ad view to database
5. **Testing** → Make sure ads show and earn money

### Files I'll Create/Modify:
```
src/renderer/adsense.js       ← New file (ad loading)
src/renderer/adPopup.js        ← Modified (real ad player)
src-tauri/src/adsense.rs       ← New file (native integration)
server-api/src/ads.js          ← Modified (revenue tracking)
```

### What You'll See:
- **Before:** 3-second countdown → green tick
- **After:** 30-second video ad → green tick → download starts

---

## 💰 REVENUE BREAKDOWN

### How Much Will You Earn?

**AdSense Rates (India):**
- **Video ads:** ₹0.80 - ₹1.50 per view
- **Display ads:** ₹0.20 - ₹0.50 per view
- **Average:** ₹1.00 per ad view

**Daily Revenue Examples:**

| Users/Day | Downloads Each | Total Ads | Revenue/Day | Revenue/Month |
|-----------|---------------|-----------|-------------|---------------|
| 50        | 5             | 250       | ₹250        | ₹7,500        |
| 100       | 5             | 500       | ₹500        | ₹15,000       |
| 500       | 10            | 5,000     | ₹5,000      | ₹1,50,000     |
| 1,000     | 10            | 10,000    | ₹10,000     | ₹3,00,000     |

**Payment Schedule:**
- **Threshold:** ₹1,000 minimum
- **Payment:** Monthly (around 21st of each month)
- **Method:** Direct bank deposit

---

## 🎮 STEP 4: TESTING PHASE (1 day - WE DO TOGETHER)

### 4.1 Dev Mode Testing (First Test)
- I'll set `testMode: true` in code
- Ads will be marked "Test Ad"
- **No real money earned** (just testing)
- You verify ads show properly

### 4.2 Live Mode Testing (Real Ads)
- I change to `testMode: false`
- **Real ads** from AdSense
- **Real revenue** starts counting
- We monitor for 24 hours

### 4.3 What to Check:
✅ Ad popup appears before download  
✅ Video ad plays for 30 seconds  
✅ Can't skip until timer ends  
✅ Green checkmark after completion  
✅ Download starts immediately  
✅ Money shows in AdSense dashboard  

---

## 📊 MONITORING YOUR REVENUE

### AdSense Dashboard (Check Daily)
**URL:** https://www.google.com/adsense

**What You'll See:**
- **Today:** Live earnings counter (updates every few hours)
- **Yesterday:** Final earnings
- **This Month:** Total so far
- **Estimated Earnings:** Pending payment

**Example Dashboard:**
```
Today:           ₹450
Yesterday:       ₹380
This Month:      ₹8,250
Pending Payment: ₹8,250
```

**Reports:**
- Click **"Reports"** → See detailed breakdowns
- **Ad requests:** How many times ads were requested
- **Impressions:** How many ads actually showed
- **Clicks:** How many users clicked ads (bonus revenue!)
- **RPM:** Revenue per 1000 impressions

---

## 🚨 ADSENSE POLICIES (IMPORTANT!)

### DO NOT:
❌ Click your own ads (instant ban)  
❌ Ask users to click ads  
❌ Put "Click here" near ads  
❌ Hide ads or make them look like content  
❌ Generate fake traffic  

### DO:
✅ Show ads naturally before downloads  
✅ Let users watch full videos  
✅ Have real users (not bots)  
✅ Follow Google's ad placement rules  
✅ Keep content family-friendly  

**Violation = Account Ban + No Payment!**

---

## ⏰ COMPLETE TIMELINE

### Week 1: Setup Phase
- **Day 1:** You create AdSense account → Wait for approval
- **Day 2-3:** Google approves (or you fix issues)
- **Day 4:** You create ad unit → Send me Publisher ID
- **Day 4-5:** I integrate ads into app (2 hours work)
- **Day 5:** Test with dev mode
- **Day 6:** Enable live mode
- **Day 7:** Monitor first earnings

### Week 2-4: Growth Phase
- Monitor daily revenue
- Track which ad types earn most
- Optimize ad placement
- Scale user acquisition

### Month 2+: Scaling
- If earning ₹500/day → Keep going
- If earning ₹5,000/day → Scale marketing
- Add PRO tier (₹249/month, no ads)

---

## 📝 YOUR ACTION CHECKLIST

**TODAY (Do these now):**
- [ ] Go to https://www.google.com/adsense
- [ ] Click "Sign Up Now"
- [ ] Fill application form
- [ ] Enter payment details (PAN, bank account)
- [ ] Wait for approval email (24-48 hours)

**AFTER APPROVAL (Next steps):**
- [ ] Create ad unit in AdSense dashboard
- [ ] Copy Publisher ID (ca-pub-XXXXXXXXXXXXXXXX)
- [ ] Send me the Publisher ID
- [ ] I integrate ads (2 hours)
- [ ] We test together (1 day)
- [ ] Go live and start earning!

---

## 🆘 COMMON QUESTIONS

**Q: What if AdSense rejects my application?**  
A: Common reasons:
- Website not owned by you → Use wordhacker404.me (we own this)
- Incomplete payment info → Fill PAN + bank details
- Policy violations → Make sure app is family-friendly

**Q: How long until I get paid?**  
A: Once you earn ₹1,000, payment comes next month around 21st.

**Q: Can I use AdMob AND AdSense?**  
A: Yes! Use AdMob for Android version (future), AdSense for desktop.

**Q: What if ads don't show?**  
A: During integration, I'll handle all technical issues. You just need the Publisher ID.

**Q: Will users hate the ads?**  
A: We show ONE ad per download. Terabox, Snaptik, SaveFrom all do this. Users are used to it for free tools.

**Q: Can I test my own ads?**  
A: YES in dev mode (marked as "Test Ad"). NO in live mode (will ban you).

---

## 🎯 NEXT STEPS FOR YOU

1. **Right now:** Go to AdSense signup page
2. **Fill the form:** Takes 10 minutes
3. **Wait:** Check email every few hours for approval
4. **Once approved:** Create ad unit and get Publisher ID
5. **Send me ID:** Paste it here, I'll integrate
6. **Start earning:** Within 48 hours of giving me the ID

---

## 💬 WHAT TO TELL ME

Once you create the AdSense account, just send:

```
AdSense Status: Approved ✅
Publisher ID: ca-pub-XXXXXXXXXXXXXXXX
Ready for integration: Yes
```

Then I'll do ALL the technical work and you start earning!

---

**Created:** December 13, 2025  
**For:** Desktop App Monetization  
**Platform:** Google AdSense  
**Revenue Target:** ₹500-₹5,000/day  
**Time to Live:** 48 hours after approval
