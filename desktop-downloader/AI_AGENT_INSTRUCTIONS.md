# 🤖 AI AGENT INSTRUCTIONS - READ FIRST!

**⚠️ CRITICAL: This is for NON-CODER user. Keep it simple and organized! ⚠️**

**🧹 LAST MAJOR CLEANUP: December 11, 2025**
**Status: ALL old/broken timeline code DELETED. Premium timeline moved to index.js.**

---

## 🎯 CRITICAL ARCHITECTURE DISCOVERY

### **JavaScript Entry Point - MUST KNOW!**
- **HTML loads**: `src/index.js` (line 516 in index.html)
- **NOT loaded**: `src/renderer/renderer.js` (exists but never runs)
- **Consequence**: Any code in renderer.js will NOT execute!
- **Solution**: All active features MUST be in `src/index.js`

**⚠️ If you add code to renderer.js, IT WILL NOT RUN! ⚠️**

---

## 📁 PROJECT FILE STRUCTURE (SINGLE SOURCE OF TRUTH)

### **EDIT THESE FILES ONLY:**

1. **HTML Structure:**
   - `desktop-downloader/index.html` ← **ROOT index.html (PRIMARY)**
   - ❌ NO `src/renderer/index.html` (DELETED - don't recreate!)
   - ✅ Uses `.premium-timeline` system ONLY

2. **CSS Styling:**
   - `desktop-downloader/src/renderer/style.css`
   - `desktop-downloader/src/renderer/tutorial.css`
   - `desktop-downloader/src/renderer/premiumEffects.css`

3. **JavaScript Logic:**
   - `desktop-downloader/src/index.js` ← **ENTRY POINT (EDIT HERE!)**
   - ✅ Timeline functions: `initPremiumTimeline()` (in index.js)
   - ❌ `src/renderer/renderer.js` - NOT LOADED BY HTML (legacy file)
   - ❌ NO OLD TIMELINE FUNCTIONS (all deleted)

---

## 🚨 CRITICAL RULES

### ✅ DO:
- **ALWAYS edit ROOT `index.html`** (at `desktop-downloader/index.html`)
- **ALWAYS add new features to `src/index.js`** (it's the entry point!)
- Edit CSS files in `src/renderer/` folder
- Use ONLY `initPremiumTimeline()` function (in index.js)
- Test after every change with `npm run dev`
- Rebuild with `npm run build` before final testing
- Keep changes simple and documented
- DELETE old code completely, don't comment it out
- Check console logs with F12 to verify code runs

### ❌ DON'T:
- ❌ Create `src/renderer/index.html` (it's deleted for a reason!)
- ❌ Add new features to `renderer.js` (it's NOT loaded!)
- ❌ Create new timeline systems (one already exists in index.js)
- ❌ Comment out broken code (DELETE it completely)
- ❌ Use `.trim-timeline`, `.new-trim-timeline`, or any old selectors
- ❌ Create functions like `updateTrimFill()`, `updateNewTrimVisuals()`, `setupCustomHandleDrag()`
- ❌ Edit files in `dist/` folder (auto-generated)
- ❌ Edit files in `build/` folder (auto-generated)
- ❌ Make complex changes without testing

---

## 🎯 TIMELINE SYSTEM (AUTHORITATIVE)

### **Current Working System:**
- **HTML ID:** `#premium-timeline`
- **Handles:** `#handle-left`, `#handle-right` (glass-effect with 3 grip lines each)
- **Functions:** 
  - `initPremiumTimeline()` - Sets up drag handlers (line ~1992)
  - `updatePremiumTimeline()` - Updates visual positions (line ~2086)

### **Deleted Systems (DO NOT RECREATE):**
- ❌ `.trim-timeline` / `.trim-track` (old range input system)
- ❌ `.new-trim-timeline` / `.new-trim-track` (failed replacement attempt)
- ❌ `updateTrimFill()` function (replaced by updatePremiumTimeline)
- ❌ `updateNewTrimVisuals()` function (broken, deleted)
- ❌ `setupCustomHandleDrag()` function (broken, deleted)
- ❌ `initializeNewTrimTimeline()` function (broken, deleted)

### **Why Multiple Systems Failed:**
1. Browser cache showed old versions
2. Multiple systems attached conflicting event listeners
3. Commented-out code was still being parsed
4. Functions called non-existent DOM elements

**LESSON: ONE SYSTEM ONLY. Delete completely, don't disable.**

---

## 🔧 DEVELOPMENT WORKFLOW

### Starting Development:
```bash
cd "desktop-downloader"
npm run dev
```
→ Opens at `http://localhost:3000`

### Building for Production:
```bash
npm run build
```
→ Creates `dist/` folder

### Clearing Cache (when changes don't show):
```bash
Remove-Item -Recurse -Force dist,node_modules/.vite
npm run build
npm run dev
```

---

## 📋 CURRENT PROJECT STATE

### ✅ Timeline Component - WORKING!
**Date Fixed**: January 2025
**Problem**: Handles visible but not draggable, no features working
**Root Cause**: Perfect timeline code existed in `renderer.js` but HTML loaded `index.js` instead
**Solution**: Moved `initPremiumTimeline()` to `src/index.js` where it actually runs

**Features Now Working:**
- ✅ Handle dragging (left/right trim points)
- ✅ Click-to-seek on timeline
- ✅ Playhead following during playback
- ✅ Input sync (handles update with trim inputs)
- ✅ Visual feedback (cursor: grab → grabbing)
- ✅ Extensive console logging with emojis

**See**: `TIMELINE_FIX_COMPLETE.md` for full details

### File Cleanup Completed:
- ✅ Removed duplicate `src/renderer/index.html`
- ✅ Single source of truth: ROOT `index.html`
- ✅ All CSS/JS properly linked
- ✅ Vite config confirmed working
- ✅ ~400 lines of broken timeline code deleted
- ✅ Premium timeline moved from renderer.js to index.js

---

## 🎯 USER EXPECTATIONS

**This user is a non-coder. They need:**
1. **Clear explanations** in simple language
2. **Step-by-step changes** - no big rewrites
3. **Immediate visibility** - always rebuild and refresh
4. **Clean file structure** - no duplicates or confusion
5. **Working features** - test everything before saying "done"

---

## 📚 REFERENCE FILES

- **Architecture:** `TAURI_ARCHITECTURE.md` - Tauri vs Electron info
- **Features:** `FEATURES.md` - App capabilities
- **Release:** `RELEASE_GUIDE.md` - Build & release process
- **Non-Coder:** `NON_CODER_GUIDE.md` - User-friendly guide

---

**Last Updated:** December 11, 2025
**Status:** Clean structure, ready for step-by-step timeline rebuild
