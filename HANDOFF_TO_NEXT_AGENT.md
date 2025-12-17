# 🤖 PROJECT HANDOFF: Word Hacker 404

**To the Next AI Agent:**
I am handing off "Word Hacker 404". Here is the exact state of the project, what works, what to watch out for, and how to verify everything.

---

## 🛠️ Tech Stack
*   **Frontend:** React (Vite) + TypeScript.
*   **Deployment:** Firebase Hosting (SPA + PWA).
*   **Database:** Firebase Firestore (User Profiles, Marketing Emails).
*   **Auth:** Firebase Google Auth.
*   **Backend:** Cloudflare Workers / Hono (AI Gateway) - *Code in `/ai-gateway`*.
*   **Desktop App:** Tauri (Rust/JS) - *Code in `/trash-hunter`*.
*   **Scripts:** PowerShell + Batch (Windows).

## ✅ Current Status (Stable)
1.  **Website:** Hosted at `word-hacker-404.web.app` (Producton).
2.  **Custom Domain:** `wordhacker404.me` (DNS propagating).
3.  **Deployment:** FULLY AUTOMATED via `DEPLOY-WEBSITE.bat`.
    *   Builds App.
    *   Deploys to Firebase.
    *   Pushes to GitHub (`git push`).
4.  **AI Features:**
    *   Unlocked/Uncensored models via Custom Gateway.
    *   "God Mode" enabled for Admin.

## ⚠️ CRITICAL "GOTCHAS" (Don't Break These)
1.  **Secrets (`.env`):**
    *   Must be **PLAIN TEXT**.
    *   ❌ `KEY='123'` (Quotes break the build).
    *   ✅ `KEY=123` (Correct).
    *   I created `verify-env-content.js` to enforce this.
2.  **Downloads:**
    *   **NO `.exe` on Firebase Free Plan.**
    *   All installers are ZIPPED (`WordHacker404-Setup.zip`).
    *   Code links point to `.zip`.
3.  **GitHub Push:**
    *   `groq-sdk` keys must NEVER be committed.
    *   Use `DEPLOY-WEBSITE.bat` or `git push` normally (secrets are gitignored).

## 📂 Key Files
*   `DEPLOY-WEBSITE.bat`: **The Master Button.** Use this to save/deploy.
*   `verify-env-content.js`: Diagnostics tool to check keys.
*   `src/services/ProAuth.ts`: Handles Login & Access Control.
*   `src/components/AIBrainWindow.tsx`: The main AI Chat UI.

## 🔮 Next Steps for You
*   **Marketing:** Export email list from Firestore (`users` collection).
*   **Mobile:** Enhance PWA features for iOS/Android.
*   **Performance:** Optimize the 3D Spline scene if it lags.

**Good luck. The system is live and stable.**
