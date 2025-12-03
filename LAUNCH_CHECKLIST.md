# 🚀 YouTube Downloader Launch Checklist

Your one-page deployment guide. Check boxes as you complete each step.

---

## 📋 **Pre-Launch Checklist**

### **Code Verification** ✓ (Already Done)
- [x] Desktop app code complete (`desktop-downloader/`)
- [x] Telegram bot code complete (`telegram-bot/`)
- [x] UI device detection working (`ToolsPage.tsx`)
- [x] Type-check passing (`npm run type-check`)
- [x] Documentation written (README, deployment guides)
- [x] Git pushed to GitHub

---

## 🤖 **Telegram Bot Deployment** (You Do This)

### **Step 1: Create Bot**
- [ ] Open Telegram, message [@BotFather](https://t.me/botfather)
- [ ] Send `/newbot`, follow prompts, choose name and username
- [ ] **Copy bot token** (format: `123456:ABC-DEF...`)
- [ ] **Copy bot username** (e.g., `WordHackerDownloaderBot`)

### **Step 2: Configure Locally**
- [ ] Open VS Code, navigate to `telegram-bot/` folder
- [ ] Copy `.env.example`, rename to `.env`
- [ ] Paste bot token into `.env` file
- [ ] Save file

### **Step 3: Test Locally**
- [ ] Open PowerShell in `telegram-bot/` folder
- [ ] Run: `python -m venv .venv`
- [ ] Run: `.\.venv\Scripts\Activate.ps1`
- [ ] Run: `pip install -r requirements.txt`
- [ ] Run: `python bot.py`
- [ ] Open bot in Telegram, send YouTube link
- [ ] Verify download works
- [ ] Press Ctrl+C to stop bot

### **Step 4: Deploy to Render** (Recommended)
- [ ] Go to [render.com](https://render.com), sign up
- [ ] Click **New** → **Web Service**
- [ ] Connect GitHub, select this repo
- [ ] Fill in:
  - Name: `word-hacker-telegram-bot`
  - Root Directory: `telegram-bot`
  - Build Command: `pip install -r requirements.txt`
  - Start Command: `python bot.py`
- [ ] Add environment variable: `BOT_TOKEN` = (paste your token)
- [ ] Click **Create Web Service**
- [ ] Wait 2-3 minutes, check logs for "Bot started"

### **Step 5: Wire Bot Link to Website**
- [ ] Open `src/components/ToolsPage.tsx` in VS Code
- [ ] Find `openTelegramBot` function (around line 120)
- [ ] Replace with:
  ```tsx
  const openTelegramBot = () => {
    window.open('https://t.me/YourBotUsername', '_blank');
  };
  ```
- [ ] Find mobile CTA button (around line 180)
- [ ] Remove `disabled` prop
- [ ] Save file
- [ ] Run: `npm run build`
- [ ] Run: `git add .`
- [ ] Run: `git commit -m "feat: wire live Telegram bot"`
- [ ] Run: `git push`

---

## 💻 **Desktop App Installer** (Choose One Option)

### **Option A: Admin PowerShell Build** (Fastest)
- [ ] Right-click PowerShell, "Run as Administrator"
- [ ] Navigate: `cd "d:\A scret project\Word hacker 404\desktop-downloader"`
- [ ] Run: `.\build-desktop.ps1 -Target win`
- [ ] Wait 5-10 minutes
- [ ] Installer at: `release/WordHacker-Downloader-Setup-1.0.0.exe`
- [ ] Test: Double-click installer, install, verify downloads work

### **Option B: GitHub Actions Build** (Easiest, No Local Setup)
- [ ] Open PowerShell in project root
- [ ] Run: `git tag desktop-v1.0.0`
- [ ] Run: `git push --tags`
- [ ] Go to GitHub repo → **Actions** tab
- [ ] Watch build run (~15 minutes)
- [ ] Go to **Releases** tab, download `.exe`/`.dmg`/`.AppImage`
- [ ] Test: Install and verify

### **Option C: Skip Installer (Dev Mode)**
- [ ] Share `desktop-downloader/LAUNCH.bat` with users
- [ ] Share `desktop-downloader/QUICK_START.md`
- [ ] Users double-click `LAUNCH.bat`, app opens
- [ ] No installer needed for alpha testing

---

## 🔗 **Wire Installer Link to Website**

### **If You Built an Installer**
- [ ] Upload `.exe` to GitHub Releases or file host (Google Drive, Dropbox)
- [ ] Copy download URL (e.g., `https://github.com/.../releases/download/desktop-v1.0.0/WordHacker-Downloader-Setup-1.0.0.exe`)
- [ ] Open `src/components/ToolsPage.tsx`
- [ ] Find `openDesktopAppDocs` function (around line 115)
- [ ] Replace with:
  ```tsx
  const openDesktopAppDocs = () => {
    window.open('YOUR_INSTALLER_URL', '_blank');
  };
  ```
- [ ] Save, run `npm run build`, commit, push

### **If Using Dev Mode**
- [ ] Installer link already points to `QUICK_START.md` (done)
- [ ] No changes needed

---

## ✅ **Final Testing**

### **Desktop**
- [ ] Visit your website on a desktop browser
- [ ] Click "Download App" button
- [ ] Verify link opens (installer download or dev mode docs)
- [ ] Install/launch app
- [ ] Paste YouTube link: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- [ ] Pick MP4 1080p
- [ ] Click Download
- [ ] File saves to `Downloads/WordHackerDownloads/`

### **Mobile**
- [ ] Visit your website on a phone browser
- [ ] Verify "Open Telegram Bot" button is enabled
- [ ] Tap button
- [ ] Telegram opens your bot
- [ ] Send YouTube link
- [ ] Tap MP3 button
- [ ] Receive audio file in chat

### **Cross-Platform**
- [ ] Test on Windows (desktop app + browser)
- [ ] Test on Android (Telegram bot)
- [ ] Test on iPhone (Telegram bot)
- [ ] Test on macOS (desktop app if built)

---

## 📊 **Launch Metrics** (Track These)

### **Week 1**
- [ ] Bot uptime: __% (check Render dashboard)
- [ ] Total downloads (desktop): __
- [ ] Total downloads (bot): __
- [ ] Support requests: __
- [ ] Average download time: __ seconds

### **Issues Encountered**
- [ ] None
- [ ] Bot deployment failed: (see TROUBLESHOOTING_DOWNLOADER.md)
- [ ] Desktop installer failed: (see TROUBLESHOOTING_DOWNLOADER.md)
- [ ] UI issues: (see TROUBLESHOOTING_DOWNLOADER.md)

---

## 🎉 **Success Criteria**

You're done when:
- [x] Bot responds to YouTube links in Telegram ✅
- [x] Desktop app downloads videos successfully ✅
- [x] Website detects devices correctly ✅
- [x] Mobile users see bot link ✅
- [x] Desktop users see app download ✅
- [ ] Zero support requests for "how to install Node.js" 🎯
- [ ] Friends/testers successfully download videos 🎯

---

## 📝 **Notes for Future You**

**When you return to this project:**
1. Open `YOUTUBE_DOWNLOADER_SUMMARY.md` first (full context)
2. Check if bot is still running: Visit [Render dashboard](https://dashboard.render.com)
3. Check if installer is hosted: Visit GitHub Releases
4. Test both platforms before making changes
5. Read `TROUBLESHOOTING_DOWNLOADER.md` if something breaks

**Completed**: [Current Date]  
**Live Bot URL**: `https://t.me/YourBotUsername` (fill this in after Step 1)  
**Installer URL**: `https://github.com/.../releases/download/...` (fill this in after building)

---

**Checklist Version**: 1.0  
**Last Updated**: 2025-01-17  
**Estimated Time**: 30-60 minutes total
