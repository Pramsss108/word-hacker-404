# Desktop Downloader - Architecture Foundation
**Last Updated**: December 10, 2025  
**Purpose**: Prevent future agent confusion and maintain clean codebase

---

## 🏗️ **FILE STRUCTURE - SINGLE SOURCE OF TRUTH**

### **✅ ACTIVE FILES (Used by App)**

```
desktop-downloader/
├── index.html                    ← PRIMARY HTML (Vite entry point)
├── vite.config.js               ← Points to index.html
├── src/
│   ├── index.js                 ← PRIMARY JAVASCRIPT (main logic)
│   └── renderer/
│       ├── style.css            ← PRIMARY CSS (all styles)
│       ├── bridge.js            ← Tauri bridge
│       ├── premiumEffects.css   ← Premium animations
│       ├── premiumEffects.js    ← Canvas animations
│       ├── premiumToggle.js     ← Toggle button logic
│       ├── tutorial.css         ← First-time popup
│       ├── tutorial.js          ← Tutorial logic
│       ├── upgradeModal.css     ← Upgrade modal
│       └── upgradeModal.js      ← Modal logic
└── src-tauri/
    ├── tauri.conf.json          ← Points to localhost:3000
    └── src/main.rs              ← Rust backend
```

### **❌ DEPRECATED/UNUSED FILES (DO NOT EDIT)**

```
src/renderer/index.html          ← OUTDATED DUPLICATE - NOT USED BY VITE
src/renderer/renderer.js         ← OLD DUPLICATE - NOT LOADED
```

**Why they exist**: Historical artifacts from refactoring. Kept for reference but NOT loaded by the app.

---

## 🎯 **HOW THE APP LOADS**

```
1. Tauri starts → reads src-tauri/tauri.conf.json
2. devPath: "http://localhost:3000" → connects to Vite dev server
3. Vite reads vite.config.js → input: index.html (ROOT)
4. index.html loads:
   - /src/renderer/style.css
   - /src/renderer/bridge.js
   - Then /src/index.js (deferred)
5. JavaScript initializes all UI logic
```

**CRITICAL**: The ROOT `index.html` is the ONLY HTML file that loads. Changes to `src/renderer/index.html` have NO EFFECT.

---

## 🔧 **CURRENT MODAL ARCHITECTURE**

### **Simple Modal System (Active)**
- **HTML**: Lines 222-232 in `/index.html`
- **CSS**: Lines 1-120 in `/src/renderer/style.css`
- **JS**: Lines 2153-2230 in `/src/index.js`
- **IDs**: `#simple-modal`, `#simple-backdrop`, `#simple-close-btn`

### **Old Modal System (Disabled)**
- **HTML**: Lines 234+ in `/index.html` (display: none !important)
- **CSS**: Lines 121-130 in `/src/renderer/style.css` (hidden)
- **Purpose**: Kept for reference, completely non-functional

---

## 🔬 **DIAGNOSTIC PANEL**

### **Purpose**
Allows clicking any element to inspect:
- Position, size, z-index
- pointer-events, cursor, display
- All computed styles
- Inner HTML preview

### **Toggle**
- Menu: Help → "🔬 Toggle Diagnostic Panel"
- Or: `diagnosticActive = true` in console

### **Files**
- **HTML**: Lines 208-220 in `/index.html`
- **CSS**: Lines 1-95 in `/src/renderer/style.css`
- **JS**: Lines 2153-2285 in `/src/index.js`

---

## ⚠️ **COMMON MISTAKES TO AVOID**

### **1. Editing Wrong HTML File**
❌ **WRONG**: Editing `src/renderer/index.html`  
✅ **CORRECT**: Edit `/index.html` (root)

### **2. Duplicate Element IDs**
- ONLY ONE `#simple-modal` should exist
- ONLY ONE `#metadata-pane` should exist
- Check with: `grep -r "id=\"simple-modal\"" index.html`

### **3. Z-Index Conflicts**
Current hierarchy (highest to lowest):
```
1000001 - Simple modal close button
1000000 - Simple modal container
999999  - Simple modal overlay
999998  - Diagnostic panel
0       - Premium canvas (pointer-events: none)
```

### **4. Pointer-Events Inheritance**
- Parent with `pointer-events: none` blocks ALL children
- Use `pointer-events: auto !important` on clickable elements
- Check cascade in DevTools computed styles

---

## 🧪 **TESTING CHECKLIST**

Before declaring "done", test ALL:

```bash
# 1. Syntax Check
npm run build  # Should complete without errors

# 2. Chip Clicks
- [ ] THUMBNAIL chip → Opens modal
- [ ] KEYWORDS chip → Opens modal
- [ ] TITLE chip → Opens modal
- [ ] DESCRIPTION chip → Opens modal

# 3. Modal Interactions
- [ ] X button closes modal
- [ ] Backdrop click closes modal
- [ ] ESC key closes modal
- [ ] Hover effects work (cursor: pointer)

# 4. No Conflicts
- [ ] No console errors
- [ ] No duplicate modals visible
- [ ] Premium toggle still works
- [ ] Download still works
```

---

## 📝 **AGENT HANDOFF PROTOCOL**

When passing to next agent:

1. **Read this file first** before making ANY changes
2. Verify file structure matches above
3. Check which HTML is actually loaded (use browser DevTools)
4. Test after EVERY change (don't batch 10 changes)
5. Use diagnostic panel to debug click issues
6. Never edit `src/renderer/index.html` or `renderer.js`

---

## 🚀 **QUICK FIX COMMANDS**

```bash
# Kill all processes and restart clean
cd desktop-downloader
.\ULTIMATE-FIX.bat

# Check which files Vite is serving
npm run dev  # Watch console for file paths

# Find duplicate IDs
grep -r "id=\"simple-modal\"" *.html

# Verify JavaScript syntax
npm run build
```

---

## 🎓 **LESSONS LEARNED**

### **Problem**: Modal not clickable
**Root Cause**: Edited wrong HTML file (src/renderer/index.html instead of index.html)  
**Solution**: Always verify Vite entry point in vite.config.js

### **Problem**: JavaScript syntax error
**Root Cause**: Missing closing brace in forEach loop  
**Solution**: Use ESLint, test after each edit

### **Problem**: Duplicate elements
**Root Cause**: Multiple HTML files with same IDs  
**Solution**: Delete unused files, maintain single source

---

## 📚 **REFERENCES**

- Vite Config: `/vite.config.js` line 16 (input: index.html)
- Tauri Config: `/src-tauri/tauri.conf.json` line 5 (devPath)
- Main JavaScript: `/src/index.js` (3200+ lines)
- Primary Styles: `/src/renderer/style.css` (2900+ lines)

---

**Last Agent**: Fixed duplicate HTML, syntax errors, added diagnostic panel  
**Status**: ✅ Build passing, ready for testing  
**Next Steps**: Test all 4 chips + modal interactions
