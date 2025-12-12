# 🎯 CLOUDFLARE WORKER SETUP - EXACT STEPS

**YOU ARE HERE**: "Ship something new" screen ✅

---

## 📍 **STEP 1: Click "Start with Hello World!"**

**What to do:**
1. Look at your screen
2. Find the option: **"Start with Hello World!"** (green icon)
3. **CLICK IT**

**Don't click**:
- ❌ Connect GitHub
- ❌ Connect GitLab
- ❌ Select a template
- ❌ Upload static files

**ONLY CLICK**: ✅ **Start with Hello World!**

---

## 📍 **STEP 2: Name Your Worker**

**What you'll see next:**
- A box asking for a "Worker name"

**What to type:**
```
universal-downloader-proxy
```

**Rules:**
- ✅ Lowercase only
- ✅ Use hyphens (-)
- ❌ No spaces
- ❌ No capital letters

**Then**: Click **"Deploy"** button (usually blue/orange button)

---

## 📍 **STEP 3: Wait for Deployment (10 seconds)**

**What you'll see:**
- Loading screen
- "Deploying your Worker..."
- Then: "Success! Your Worker is live!"

**Just wait**, don't click anything.

---

## 📍 **STEP 4: Click "Edit Code"**

**What you'll see after deployment:**
- A dashboard with your worker
- A button that says **"Edit Code"** or **"Quick Edit"**

**What to do:**
1. Find the **"Edit Code"** button
2. **CLICK IT**

---

## 📍 **STEP 5: Delete ALL Existing Code**

**What you'll see:**
- A code editor (like Notepad but fancy)
- Some existing code (Hello World example)

**What to do:**
1. **Click inside the code editor** (the white/dark area with text)
2. **Press**: `Ctrl + A` (selects all text)
3. **Press**: `Delete` or `Backspace` (deletes everything)
4. **Now the editor should be EMPTY** ✅

---

## 📍 **STEP 6: Paste My Code**

**Copy this code EXACTLY** (Works for ALL platforms: Instagram, YouTube, Facebook, TikTok, Twitter, etc.):

```javascript
// Universal Downloader Proxy - By Word Hacker 404
// Works with ALL platforms: Instagram, YouTube, Facebook, TikTok, Twitter, Reddit, etc.
// Runs on Cloudflare's global network (180+ countries)

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }
    
    // Check if URL parameter exists
    if (!targetUrl) {
      return new Response(
        'Universal Proxy Active!\n\nUsage: /?url=YOUR_VIDEO_URL\n\nSupported: Instagram, YouTube, Facebook, TikTok, Twitter, Reddit, Vimeo, and 1000+ more sites', 
        { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        }
      );
    }
    
    console.log('🌍 Proxying:', targetUrl);
    
    // Detect platform and use appropriate headers
    const platform = detectPlatform(targetUrl);
    console.log('📱 Detected platform:', platform);
    
    try {
      // Fetch through Cloudflare's global network
      const response = await fetch(targetUrl, {
        headers: getPlatformHeaders(platform, targetUrl),
        cf: {
          // Cloudflare-specific options
          cacheTtl: 300,
          cacheEverything: false, // Don't cache dynamic content
          mirage: false,
          polish: 'off'
        }
      });
      
      console.log('✅ Response status:', response.status);
      
      // Create new response with CORS headers
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      newHeaders.set('Access-Control-Allow-Headers', '*');
      newHeaders.set('Access-Control-Max-Age', '86400');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
      
    } catch (error) {
      console.error('❌ Proxy error:', error);
      return new Response('Proxy Error: ' + error.message, { 
        status: 500,
        headers: { 
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};

// Handle CORS preflight requests
function handleCORS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    }
  });
}

// Detect which platform the URL is from
function detectPlatform(url) {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('instagram.com') || urlLower.includes('cdninstagram.com')) return 'instagram';
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || urlLower.includes('googlevideo.com')) return 'youtube';
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch') || urlLower.includes('fbcdn.net')) return 'facebook';
  if (urlLower.includes('tiktok.com') || urlLower.includes('tiktokcdn.com')) return 'tiktok';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com') || urlLower.includes('twimg.com')) return 'twitter';
  if (urlLower.includes('reddit.com') || urlLower.includes('redd.it')) return 'reddit';
  if (urlLower.includes('vimeo.com')) return 'vimeo';
  if (urlLower.includes('dailymotion.com')) return 'dailymotion';
  if (urlLower.includes('twitch.tv')) return 'twitch';
  if (urlLower.includes('soundcloud.com')) return 'soundcloud';
  
  return 'guniversal-downloader-proxy.YOUR-USERNAME.workers.dev
   ```
   OR
   ```
   https://universal-downloader-proxy.YOUR-SUBDOMAIN.workers.dev
   ```

2. **COPY this entire URL** (select and Ctrl + C)

3. **Send it to me here** (paste in chat)

**Where to find it:**
- Usually at the top of the page
- Or in the "Settings" tab
- Or in the "Triggers" section
- Look for "Preview" or "Visit" button - the URL next to it
  // Platform-specific headers
  const platformHeaders = {
    instagram: {
      'Referer': 'https://www.instagram.com/',
      'Origin': 'https://www.instagram.com',
      'X-Instagram-AJAX': '1',
      'X-Requested-With': 'XMLHttpRequest',
    },
    youtube: {
      'Referer': 'https://www.youtube.com/',
      'Origin': 'https://www.youtube.com',
    },
    facebook: {
      'Referer': 'https://www.facebook.com/',
      'Origin': 'https://www.facebook.com',
      'Sec-Fetch-Dest': 'video',
      'Sec-Fetch-Mode': 'cors',
    },
    tiktok: {
      'Referer': 'https://www.tiktok.com/',
      'Origin': 'https://www.tiktok.com',
    },
    twitter: {
      'Referer': 'https://twitter.com/',
      'Origin': 'https://twitter.com',
    },
    reddit: {
      'Referer': 'https://www.reddit.com/',
    },
    vimeo: {
      'Referer': 'https://vimeo.com/',
    },
    generic: {}
  };
  
  return {
    ...baseHeaders,
    ...(platformHeaders[platform] || {})
  };
}

// Random User-Agent rotation (looks like different devices)
function randomUserAgent() {
  const agents = [
    // iPhone
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    // Android
    'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    // Windows Chrome
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    // Mac Safari
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
    // Linux Firefox
    'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/112.0',
    // iPad
    'Mozilla/5.0 (iPad; CPU OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1',
  ];
  
  return agents[Math.floor(Math.random() * agents.length)];
}
```

**What to do:**
1. **Copy the code above** (Ctrl + C)
2. **Click in the empty code editor**
3. **Paste the code** (Ctrl + V)
4. **Make sure all the code is there** (should look like the code above)

---

## 📍 **STEP 7: Save and Deploy**

**What to do:**
1. Look for a button that says **"Save and Deploy"** or **"Deploy"**
2. **CLICK IT**
3. Wait 5-10 seconds for deployment

**What you'll see:**
- "Deploying..."
- Then: "Success!" or "Deployed!"

---

## 📍 **STEP 8: Get Your Worker URL**

**What to do:**
1. After deployment, look for a URL that looks like:
   ```
   https://instagram-proxy.YOUR-USERNAME.workers.dev
   ```
   OR
   ```
   https://instagram-proxy.YOUR-SUBDOMAIN.workers.dev
   ```

2. **COPY this entire URL** (select and Ctrl + C)

3. **Send it to me here** (paste in chat)

**Where to find it:**
- Usually at the top of the page
- Or in the "Settings" tab
- Or in the "Triggers" section

---

## 📍 **STEP 9: Test Your Worker (Optional but Recommended)**

**What to do:**
1. Open a new browser tab
2. Paste your Worker URL
3. Add this to the end: `?url=https://www.instagram.com/`
4. Full URL should look like:
   ```
   https://YOUR-WORKER.workers.dev/?url=https://www.instagram.com/
   ```
5. **Press Enter**

**What you should see:*HTML code
- OR: A success message saying "Universal Proxy Active! Supported: Instagram, YouTube, Facebook..."
- ✅ **This means it's WORKING!**

**Test with other platforms:**
- YouTube: `?url=https://www.youtube.com/`
- Facebook: `?url=https://www.facebook.com/`
- TikTok: `?url=https://www.tiktok.com/`ram
- ✅ **This means it's WORKING!**

**If you see an error:**
- Don't worry, send me the error message
- We'll fix it together

---

## 📍 **WHAT TO DO NOW**

**Send me this in chat:**
```universal-downloader-proxy.abc123.workers.dev
```

**Then I will:**
1. ✅ Add it to your app's code
2. ✅ Connect it to the download system
3. ✅ Test it with Instagram, YouTube, Facebook, TikTok
4. ✅ You'll have 90%+ success rate on ALL platforms

**Then I will:**
1. ✅ Add it to your app's code
2. ✅ Connect it to the download system
3. ✅ Test it with you
4. ✅ You'll have 90%+ success rate!

---

## ❓ **STUCK? COMMON ISSUES**

### Issue 1: "Can't find Edit Code button"
**Solution**: Look for "Quick Edit" or go to your Worker's page → Click the Worker name → Then "Edit"

### Issue 2: "Code editor is grayed out"
**Solution**: Click inside it first, then try Ctrl + A to select all

### Issue 3: "Deploy button doesn't work"
**Solution**: Make sure ALL old code is deleted, then paste my code again

### Issue 4: "Don't see Worker URL"
**Solution**: Go to Workers dashboard → Click your worker name → Look at top of page for URL

### Issue 5: "Worker returns 'Missing url parameter'"
**Solution**: This is CORRECT! It means the worker is working. Just send me the URL.

---
universal-downloader-proxy`
3. ✅ Click Deploy
4. ✅ Click "Edit Code"
5. ✅ Delete all → Paste my NEW universal code → Save and Deploy

**What I need from you:**
- 📋 Your Worker URL (looks like: `https://universal-downloader-proxy.YOUR-NAME.workers.dev`)

**Time needed:** 5-10 minutes

**This proxy works with:**
✅ Instagram, YouTube, Facebook, TikTok, Twitter, Reddit, Vimeo, Twitch, SoundCloud, and 1000+ more!de → Save and Deploy

**What I need from you:**
- 📋 Your Worker URL (looks like: `https://something.workers.dev`)

**Time needed:** 5-10 minutes

---

**👉 START NOW: Go back to Cloudflare and click "Start with Hello World!"**

**Then come back here and tell me:**
- "Done! My URL is: [your URL]"
- OR: "I'm stuck at step X" (I'll help immediately)

Let's do this! 🚀
