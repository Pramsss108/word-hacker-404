# YouTube Downloader Troubleshooting Guide

Quick fixes for common issues. For non-coders—find your problem, follow the steps.

---

## 🖥️ **Desktop App Issues**

### **Issue: "LAUNCH.bat doesn't open anything"**

**Symptoms**: Double-click `LAUNCH.bat`, nothing happens or window closes immediately.

**Fixes**:
1. **Check if Node.js is installed**:
   - Open PowerShell, type `node -v`
   - If you see "not recognized", download Node.js from [nodejs.org](https://nodejs.org)
   - Install, restart computer, try again

2. **Check the terminal output**:
   - Right-click `LAUNCH.bat`, choose "Edit"
   - Find the line `npm start`, change it to `npm start & pause`
   - Save, double-click again
   - Read any error messages before the window closes

3. **Manual launch**:
   - Open PowerShell
   - Navigate: `cd "d:\A scret project\Word hacker 404\desktop-downloader"`
   - Run: `npm install`
   - Run: `npm start`
   - Watch for error messages

**Common Errors**:
- `Error: Cannot find module 'electron'` → Run `npm install`
- `Permission denied` → Close any open app windows, try again
- `Port 3000 in use` → Close other apps using port 3000 (check for other Electron apps)

---

### **Issue: "App opens but downloads fail"**

**Symptoms**: App window loads, you paste URLs, click Download, but nothing happens or errors appear.

**Fixes**:
1. **Check internet connection**: Ping YouTube to verify access
2. **Check URL format**: Must be full YouTube URLs (e.g., `https://youtube.com/watch?v=...`)
3. **Check logs**: Look at the status panel in the app for error messages
4. **Try a different video**: Some videos may be region-locked or private

**Common Errors**:
- `Video unavailable` → Video is private/deleted/region-locked
- `No formats found` → Video doesn't have the requested quality (try 720p instead of 1080p)
- `FFmpeg error` → Close app, delete `node_modules/ffmpeg-static`, run `npm install`, restart

---

### **Issue: "Where are my downloaded files?"**

**Symptoms**: Downloads succeed but you can't find the files.

**Fixes**:
1. **Default location**: Open File Explorer, go to `Downloads` folder
2. **Subfolder**: Look inside `WordHackerDownloads` folder
3. **Check app logs**: The status panel shows full file paths after download completes
4. **Search**: Press Windows key, type the video title, filter by "Downloads" location

**Path Examples**:
- Windows: `C:\Users\YourName\Downloads\WordHackerDownloads\`
- macOS: `/Users/YourName/Downloads/WordHackerDownloads/`
- Linux: `/home/YourName/Downloads/WordHackerDownloads/`

---

### **Issue: "Packaging fails (symlink error)"**

**Symptoms**: Running `npm run package:win` shows "Cannot create symbolic link : A required privilege is not held by the client"

**Fixes**:
1. **Use admin PowerShell**:
   - Right-click PowerShell icon
   - Choose "Run as Administrator"
   - Navigate: `cd "d:\A scret project\Word hacker 404\desktop-downloader"`
   - Run: `.\build-desktop.ps1 -Target win`

2. **Use GitHub Actions**:
   - Push a tag: `git tag desktop-v1.0.0 && git push --tags`
   - Wait 15 minutes for builds to complete
   - Download installer from GitHub Releases

3. **Build on macOS/Linux**:
   - Symlinks work natively on Unix systems
   - Run `npm run package:mac` or `npm run package:linux`

**Why this happens**: Windows requires admin rights to create symbolic links. electron-builder downloads macOS signing tools even for Windows builds.

---

## 📱 **Telegram Bot Issues**

### **Issue: "Bot doesn't respond to messages"**

**Symptoms**: You send a YouTube link, bot doesn't reply or shows "typing..." forever.

**Fixes**:
1. **Check if bot is running**:
   - Local: Look for a PowerShell window with `python bot.py` running
   - Render: Check [dashboard](https://dashboard.render.com) → your service → Logs tab

2. **Check bot token**:
   - Open `telegram-bot/.env`
   - Verify `BOT_TOKEN=123456:ABC...` is correct (copy from @BotFather)
   - No spaces, no quotes around the token

3. **Check internet connection**: Bot needs to reach `api.telegram.org`

4. **Restart bot**:
   - Local: Press Ctrl+C in PowerShell, run `python bot.py` again
   - Render: Dashboard → your service → Manual Deploy

**Common Errors** (check bot logs):
- `Unauthorized` → Wrong bot token
- `Conflict: terminated by other getUpdates request` → Two instances running (stop one)
- `ConnectionError` → Internet/firewall issue

---

### **Issue: "Bot says 'Download failed'"**

**Symptoms**: You select format, bot shows downloading, then sends error message.

**Fixes**:
1. **Check video availability**: Try opening the link in a browser
2. **Try different quality**: If 1080p fails, try 720p
3. **Check bot logs** (Render dashboard or local terminal):
   - `ERROR: This video is unavailable` → Video is private/deleted
   - `ERROR: No such format` → Quality not available for this video
   - `ERROR: unable to download` → Network issue or YouTube rate limiting

4. **Update yt-dlp**:
   - Local: `.\.venv\Scripts\Activate.ps1`, then `pip install --upgrade yt-dlp`
   - Render: Redeploy (triggers fresh `pip install`)

**Rate Limiting**: If many users download simultaneously, YouTube may throttle. Wait 5-10 minutes, try again.

---

### **Issue: "File too large / Bot doesn't upload"**

**Symptoms**: Bot downloads successfully but never sends the file.

**Fixes**:
1. **Check file size limit**: Default is 48 MB (Telegram API limit)
2. **Try lower quality**: MP4 720p instead of 1080p, or MP3 instead of video
3. **Increase limit** (if you have Telegram Premium):
   - Edit `telegram-bot/.env`, change `MAX_UPLOAD_MB=48` to `MAX_UPLOAD_MB=2000`
   - Restart bot

**Workarounds**:
- Use desktop app instead (no file size limit)
- Use YouTube Premium (download directly via YouTube app)
- Split long videos into parts (not currently supported by bot)

---

### **Issue: "Bot deployed but link doesn't work"**

**Symptoms**: You deployed to Render, but mobile CTA button is disabled or shows "not found".

**Fixes**:
1. **Get bot username**: Message @BotFather, send `/mybots`, note the username
2. **Update ToolsPage.tsx**:
   ```tsx
   const openTelegramBot = () => {
     window.open('https://t.me/YourBotUsername', '_blank');
   };
   ```
3. **Enable button**:
   ```tsx
   <button
     onClick={openTelegramBot}
     className="cta-primary glow-accent"
   >
     Open Telegram Bot →
   </button>
   ```
   (Remove `disabled` prop)
4. **Push changes**: `npm run build && git add . && git commit -m "wire bot link" && git push`

---

## 🌐 **Website/UI Issues**

### **Issue: "Download button not working"**

**Symptoms**: Click "Download App" on desktop, nothing happens.

**Fixes**:
1. **Check browser console** (F12 → Console tab):
   - `Blocked by CORS` → Installer not hosted yet (see deployment docs)
   - `404 Not Found` → Installer URL incorrect

2. **Verify link**:
   - Open `src/components/ToolsPage.tsx`
   - Find `openDesktopAppDocs` function
   - Ensure URL points to hosted installer or `QUICK_START.md`

3. **Clear cache**: Ctrl+F5 to force reload

**Current Expected Behavior**: Button opens GitHub docs (QUICK_START.md) until installer is hosted.

---

### **Issue: "Mobile CTA not showing"**

**Symptoms**: On mobile, you see desktop app instructions instead of Telegram bot button.

**Fixes**:
1. **Check device detection**:
   - Open browser DevTools (F12)
   - Toggle device toolbar (Ctrl+Shift+M)
   - Select "iPhone SE" or "Galaxy S20"
   - Reload page
   - Mobile CTA should appear

2. **Verify user agent**: In DevTools console, run `navigator.userAgent`
   - Should contain "Mobile" or "Android"

3. **Check ToolsPage logic**:
   ```tsx
   const isDesktopDevice = !/Mobi|Android/i.test(navigator.userAgent);
   ```
   - If this returns `true` on mobile, device detection is broken

**Current Expected Behavior**: Mobile CTA button is disabled until bot is deployed.

---

## 🔧 **Development Issues**

### **Issue: "Type-check fails"**

**Symptoms**: `npm run type-check` shows TypeScript errors.

**Fixes**:
1. **Read the errors**: Most common:
   - `Property does not exist` → Add missing import or type definition
   - `Type 'X' is not assignable to type 'Y'` → Fix type mismatch

2. **Check `tsconfig.json`**: Ensure `strict: true` is set

3. **Restart TypeScript server**: VS Code → Ctrl+Shift+P → "TypeScript: Restart TS Server"

**Common Errors**:
- `Cannot find module 'lucide-react'` → Run `npm install`
- `Could not find declaration file for module 'sanitize-filename'` → Add `declare module 'sanitize-filename'` to `src/vite-env.d.ts`

---

### **Issue: "Build fails"**

**Symptoms**: `npm run build` errors out.

**Fixes**:
1. **Fix TypeScript errors first**: Run `npm run type-check`, resolve all errors
2. **Clear cache**: Delete `dist/` folder, run `npm run build` again
3. **Check Vite config**: Ensure `vite.config.ts` has correct `base` setting
   - Custom domain: `base: '/'`
   - GitHub Pages project: `base: '/word-hacker-404/'`

**Common Errors**:
- `Out of memory` → Increase Node heap: `NODE_OPTIONS=--max_old_space_size=4096 npm run build`
- `Module not found` → Run `npm install`

---

### **Issue: "GitHub Actions build fails"**

**Symptoms**: Push a tag, Actions workflow runs but fails.

**Fixes**:
1. **Check workflow logs**: GitHub repo → Actions tab → click failed run
2. **Common causes**:
   - `npm ci` fails → Delete `package-lock.json`, run `npm install`, commit
   - `electron-builder` fails → Check `package.json` dependencies section (electron should be in devDependencies)
   - Permissions error → Add `permissions: { contents: write }` to release job

3. **Test locally first**: Run `npm run package:win` before pushing tags

---

## 🆘 **Emergency Recovery**

### **"Nothing works, start from scratch"**

1. **Delete everything**:
   ```powershell
   cd "d:\A scret project\Word hacker 404"
   Remove-Item -Recurse node_modules, desktop-downloader/node_modules
   Remove-Item package-lock.json, desktop-downloader/package-lock.json
   ```

2. **Fresh install**:
   ```powershell
   npm install
   cd desktop-downloader
   npm install
   ```

3. **Verify**:
   ```powershell
   npm run type-check
   npm run build
   cd desktop-downloader
   npm start
   ```

4. **If still broken**: Ask Copilot, share error logs, mention this file.

---

## 📞 **Getting Help**

### **Non-Coders**: Describe the problem like this:
- "I clicked LAUNCH.bat and a black window flashed then closed"
- "I sent a YouTube link to the bot but it's been 5 minutes and no reply"
- "Downloads work but I can't find the files"

### **For Copilot**: Share context:
- Error messages (copy full text)
- What you were doing (step-by-step)
- What you expected vs what happened
- Mention: "Check YOUTUBE_DOWNLOADER_SUMMARY.md for architecture"

---

**Troubleshooting Guide Version**: 1.0  
**Last Updated**: 2025-01-17  
**Covers**: Desktop app, Telegram bot, website UI, builds, deployments
