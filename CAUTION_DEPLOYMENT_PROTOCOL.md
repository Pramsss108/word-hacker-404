# ⚠️ CAUTION: DEPLOYMENT & ARCHITECTURE PROTOCOL ⚠️

### **!! READ BEFORE DOING ANY DEPLOYS !!**

This document tracks the critical synchronization requirements for **Word Hacker 404**. Failure to follow these steps will result in the live site (`wordhacker404.me`) becoming outdated or throwing 404 errors.

---

## 🏗️ 1. The Dual-Host Architecture
This project uses two separate "houses" for the code:
1.  **PRIMARY (Live Site)**: [Firebase Hosting](https://console.firebase.google.com/project/word-hacker-404)
    *   Connected to: `wordhacker404.me`
    *   **CRITICAL**: `git push` DOES NOT update this house. You must use the Firebase CLI.
2.  **SECONDARY (Backup)**: [GitHub Pages](https://pramsss108.github.io/word-hacker-404/)
    *   Automated via GitHub Actions.
    *   Updated on every `git push`.

## 🚀 2. The Golden Deployment Command
To make a tool or change visible on the live site, you **MUST** run these in sequence:

```powershell
# Step A: Save the Blueprint (GitHub)
git add .
git commit -m "feat: your change"
git push origin main

# Step B: Build & Launch the Store (Firebase)
npm run build
firebase deploy --only hosting
```

## 🛡️ 3. Critical Safeguards (Do Not Change)
Future AI Agents must NOT revert these settings:

*   **Vite Base Path**: `vite.config.ts` must use `base: './'`. If changed to `/`, assets will break on GitHub Pages.
*   **SPA 404 Fallback**: The `public/404.html` (copy of index.html) must always exist. Without it, direct links like `/freesarkarifilecompress` will crash the browser on refresh.
*   **Root Metadata**: The `index.html` metadata is optimized for social sharing (WhatsApp/Twitter). Do not overwrite with generic "Vite App" text.

## 🛑 4. Compromise Prevention
- **API Keys**: Only use the `.env` system for Firebase keys.
- **Sensitive Logic**: This is a **Client-Side** project. Never add server-side secrets or Node.js backend logic to the `src/` folder; it will be leaked to the browser.
- **Node Dependencies**: Ensure `firebase-tools` is present in `devDependencies`.

---
*Protocol established on 2026-02-21 by Antigravity AI.*
