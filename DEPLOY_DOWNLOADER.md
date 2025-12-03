# YouTube Downloader — Deployment Checklist

Complete guide for launching the cross-platform YouTube downloader (Desktop App + Telegram Bot) with zero backend costs.

---

## ✅ Completed

- ✅ PowerShell helper with dependency auto-install (`tools/internet-downloader/`)
- ✅ Electron desktop app (Windows/macOS/Linux) at `desktop-downloader/`
- ✅ Device detection in UI (`src/components/ToolsPage.tsx`)
- ✅ Telegram bot scaffold (`telegram-bot/bot.py`)
- ✅ Non-coder launch scripts (`LAUNCH.bat`, `QUICK_START.md`)
- ✅ Type-check passing

---

## 🚧 Remaining Tasks

### **1. Desktop App Installer**

**Status**: Code complete, packaging blocked by Windows symlink permissions.

**Options**:
- **Option A (Admin Build)**: Open **PowerShell as Administrator**, run:
  ```powershell
  cd "d:\A scret project\Word hacker 404\desktop-downloader"
  .\build-desktop.ps1 -Target win
  ```
  Installer will be at `release/WordHacker-Downloader-Setup-1.0.0.exe`.

- **Option B (GitHub Actions)**: Create `.github/workflows/build-desktop.yml`:
  ```yaml
  name: Build Desktop App
  on:
    push:
      tags: ['v*']
  jobs:
    build-windows:
      runs-on: windows-latest
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-node@v3
          with: { node-version: 20 }
        - run: npm install
          working-directory: desktop-downloader
        - run: npm run package:win
          working-directory: desktop-downloader
        - uses: actions/upload-artifact@v3
          with:
            name: windows-installer
            path: desktop-downloader/release/*.exe
  ```
  Tag a commit (`git tag v1.0.0 && git push --tags`) to trigger the build.

- **Option C (macOS/Linux)**: Build on a Mac or Linux machine where symlinks work:
  ```bash
  cd desktop-downloader
  npm install
  npm run package:mac    # or package:linux
  ```

**Deploy Installer**:
1. Upload the built `.exe`/`.dmg`/`.AppImage` to GitHub Releases or a file host.
2. Copy the download URL.
3. Update `src/components/ToolsPage.tsx`:
   ```tsx
   const openDesktopAppDocs = () => {
     window.open('https://github.com/pramsss108/word-hacker-404/releases/download/v1.0.0/WordHacker-Downloader-Setup-1.0.0.exe', '_blank');
   };
   ```
4. Rebuild and push:
   ```powershell
   npm run build
   git add src/components/ToolsPage.tsx
   git commit -m "feat: wire desktop app installer download"
   git push
   ```

---

### **2. Telegram Bot Deployment**

**Status**: Code complete, requires bot token and hosting.

**Steps**:

1. **Create bot on Telegram**:
   - Open [@BotFather](https://t.me/botfather) in Telegram.
   - Send `/newbot`, follow prompts, note the token (e.g., `123456:ABC-DEF...`).

2. **Configure locally**:
   ```powershell
   cd "d:\A scret project\Word hacker 404\telegram-bot"
   Copy-Item .env.example .env
   # Edit .env in VS Code, paste your BOT_TOKEN
   ```

3. **Test locally**:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python bot.py
   ```
   Open your bot in Telegram, send a YouTube link, verify download works. Press Ctrl+C to stop.

4. **Deploy for 24/7 uptime**:

   **Option A (Render.com — Free Tier)**:
   - Push `telegram-bot/` to a GitHub repo (or create a subfolder).
   - Create a new [Render Web Service](https://render.com).
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python bot.py`
   - Add environment variable: `BOT_TOKEN` = your token.
   - Deploy. Bot runs 24/7 on Render's free tier (sleeps after inactivity but wakes on message).

   **Option B (VPS — Hetzner/DigitalOcean)**:
   - SSH into your server, clone the repo.
   - Install Python 3.11+, create venv, install requirements.
   - Run via systemd or PM2:
     ```bash
     # systemd example
     sudo nano /etc/systemd/system/telegram-bot.service
     # [Service]
     # WorkingDirectory=/path/to/telegram-bot
     # ExecStart=/path/to/.venv/bin/python bot.py
     # Restart=always
     sudo systemctl enable telegram-bot
     sudo systemctl start telegram-bot
     ```

5. **Wire bot link into UI**:
   - Once deployed, your bot has a link like `https://t.me/YourBotUsername`.
   - Update `src/components/ToolsPage.tsx` mobile CTA:
     ```tsx
     const openTelegramBot = () => {
       window.open('https://t.me/YourBotUsername', '_blank');
     };
     ```
   - Replace the disabled button:
     ```tsx
     {/* Step 03 Mobile */}
     <button
       onClick={openTelegramBot}
       className="cta-primary glow-accent"
     >
       Open Telegram Bot →
     </button>
     ```
   - Rebuild and push:
     ```powershell
     npm run build
     git add src/components/ToolsPage.tsx
     git commit -m "feat: wire live Telegram bot link for mobile"
     git push
     ```

---

### **3. Final Testing**

- **Desktop**: Download the installer from your hosted URL, run it, verify downloads work.
- **Mobile**: Open the bot on a phone, send a YouTube link, verify file arrives.
- **UI Flow**: Visit live site on desktop (download button works) and mobile (Telegram bot link works).

---

## 🎯 Success Criteria

- [ ] Desktop users click "Download App", get an `.exe`/`.dmg`, install, paste link, get video.
- [ ] Mobile users click "Open Telegram Bot", message bot, receive file.
- [ ] Zero backend bills (bot runs on free tier, desktop app is client-only).
- [ ] Zero terminal commands for end users.

---

## 📝 Notes for Non-Coders

**Current Workaround (Desktop)**:  
The installer packaging requires admin permissions or CI. Until then, use dev mode:
1. Double-click `desktop-downloader/LAUNCH.bat`.
2. App window opens, paste link, download.

**Why Telegram for Mobile?**:  
No app stores, no mobile app builds—just a bot link. Works on any phone with Telegram installed.

**Next AI Session**:  
If you return later, the agent should:
1. Check if installer is hosted → update ToolsPage link.
2. Check if bot is deployed → update mobile CTA.
3. Run type-check + build to validate.
4. Push final changes.

---

**Last Updated**: [Current Date]  
**Status**: Desktop app ready (dev mode), Telegram bot ready (needs token), UI wired with placeholders.
