# Quick Deploy Reference — Non-Coder Edition

Your no-terminal guide to launching the YouTube downloader.

---

## 🤖 **Telegram Bot (For Mobile Users)**

### **Step 1: Create the Bot**
1. Open Telegram on your phone or desktop.
2. Search for [@BotFather](https://t.me/botfather).
3. Send `/newbot` and follow the prompts.
4. Copy the token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`).

### **Step 2: Configure**
1. Open VS Code.
2. Navigate to `telegram-bot/` folder.
3. Copy `.env.example` file, rename to `.env`.
4. Paste your bot token into the `.env` file:
   ```
   BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   MAX_UPLOAD_MB=48
   ```
5. Save the file.

### **Step 3: Test Locally**
1. Open PowerShell **in the `telegram-bot/` folder**.
2. Run these commands **one at a time**:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python bot.py
   ```
3. Open your bot in Telegram (search for the username you created).
4. Send a YouTube link.
5. Choose MP4 or MP3.
6. The bot should send the file back!
7. Press **Ctrl+C** in PowerShell to stop the bot.

### **Step 4: Deploy (24/7 Hosting)**

**Option A: Render.com (Easiest, Free)**
1. Go to [render.com](https://render.com) and sign up.
2. Click **New** → **Web Service**.
3. Connect your GitHub account, select this repo.
4. Fill in:
   - **Name**: word-hacker-telegram-bot
   - **Root Directory**: `telegram-bot`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python bot.py`
5. Add environment variable:
   - **Key**: `BOT_TOKEN`
   - **Value**: (paste your token)
6. Click **Create Web Service**.
7. Wait 2-3 minutes for deployment. Your bot is now live 24/7!

**Option B: Ask someone with a VPS**
- Share the `telegram-bot/` folder and your bot token.
- They'll run it on their server using systemd or PM2.

### **Step 5: Add Bot Link to Website**
1. Find your bot's username (the one you chose in BotFather).
2. The link is: `https://t.me/YourBotUsername`
3. Open `src/components/ToolsPage.tsx` in VS Code.
4. Find the mobile CTA button (around line 180).
5. Replace the `disabled` button with:
   ```tsx
   <button
     onClick={() => window.open('https://t.me/YourBotUsername', '_blank')}
     className="cta-primary glow-accent"
   >
     Open Telegram Bot →
   </button>
   ```
6. Save, then run:
   ```powershell
   npm run build
   git add src/components/ToolsPage.tsx
   git commit -m "feat: add live Telegram bot link"
   git push
   ```
7. Your website now shows the bot link for mobile users!

---

## 💻 **Desktop App (For Windows/macOS/Linux)**

### **Option 1: Use Dev Mode (No Admin Needed)**
1. Navigate to `desktop-downloader/` folder in File Explorer.
2. Double-click `LAUNCH.bat`.
3. The app window opens automatically.
4. Paste YouTube links, click **Download**.
5. Files appear in `Downloads/WordHackerDownloads/`.

**For Your Friends**:
- Share `LAUNCH.bat` and `QUICK_START.md` with them.
- They just double-click and go!

### **Option 2: Build a Real Installer (Admin Required)**
1. Right-click PowerShell icon, choose **Run as Administrator**.
2. Navigate to the project:
   ```powershell
   cd "d:\A scret project\Word hacker 404\desktop-downloader"
   ```
3. Run the build:
   ```powershell
   .\build-desktop.ps1 -Target win
   ```
4. Wait 5-10 minutes. The installer will be at:
   ```
   desktop-downloader/release/WordHacker-Downloader-Setup-1.0.0.exe
   ```
5. Upload this `.exe` to GitHub Releases or Google Drive.
6. Share the download link!

### **Option 3: Auto-Build with GitHub Actions (No Local Setup)**
1. Make sure `.github/workflows/build-desktop.yml` exists (already created).
2. Open PowerShell in the project root:
   ```powershell
   git tag desktop-v1.0.0
   git push --tags
   ```
3. Go to your GitHub repo → **Actions** tab.
4. Watch the build run (takes ~15 minutes).
5. When done, installers appear in **Releases** section.
6. Download the `.exe` (Windows), `.dmg` (Mac), or `.AppImage` (Linux).
7. Update `src/components/ToolsPage.tsx` to link to the download URL.

---

## ✅ **Checklist Before Going Live**

- [ ] Telegram bot running on Render/VPS (not just your laptop)
- [ ] Bot link added to website mobile CTA
- [ ] Desktop installer built and uploaded (or dev mode instructions shared)
- [ ] Desktop download button wired to installer URL
- [ ] Tested on your phone (Telegram bot)
- [ ] Tested on desktop (app downloads videos successfully)

---

## 🆘 **Troubleshooting**

**Bot doesn't respond**:
- Check if `python bot.py` is running (locally) or deployed (Render).
- Verify bot token is correct in `.env`.

**Desktop app won't open**:
- Make sure Node.js is installed (`node -v` in PowerShell).
- Try running `npm install` in `desktop-downloader/` folder.

**Packaging fails (symlink error)**:
- Use **admin PowerShell** or GitHub Actions instead.

**Files don't download**:
- Check internet connection.
- Verify FFmpeg is installed (desktop app includes it, bot requires manual install).

---

**Need Help?**  
Open a new chat with Copilot and share this guide. The agent will know exactly where you left off!
