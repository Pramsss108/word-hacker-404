# Word Hacker 404 - Copilot Instructions

## ⚠️ CRITICAL ARCHITECTURE NOTICE FOR AI AGENTS

### Desktop Downloader Sub-Project (desktop-downloader/)
**This is a TAURI application (Rust + React), NOT Electron!**

- **Backend:** Rust (Tauri) - Located in `desktop-downloader/src-tauri/`
- **Frontend:** React + TypeScript + Vite
- **Run with:** `npm run tauri:dev` (NOT `npm run dev` or electron commands)
- **APIs:** Use `window.__TAURI__` (NOT `window.downloader` or Electron IPC)
- **NO preload.js, NO contextBridge, NO Electron APIs**

**See `desktop-downloader/TAURI_ARCHITECTURE.md` for full details before making ANY changes to the desktop app!**

---

## Project Overview
**Word Hacker 404** is an AI-powered word game and linguistic decode experience built with React, TypeScript, and Vite. This project is completely independent—treat it standalone.

**🚨 CRITICAL: This project is COMPLETELY SEPARATE from BongBari or any other projects. Never mix code or configurations between projects.**

## Technology Stack (Final)
- Frontend: React 18 + TypeScript + Vite
- Styling: CSS (no Tailwind); modern CSS only (gradients, glass, animations)
- Icons: Lucide React
- Fonts: Inter (display/body), JetBrains Mono (terminal)
- Background FX: Canvas-based Matrix code rain (client-only)
- Dev server: `http://localhost:3001` (auto-selects if 3000 is busy)
- Build Tool: Vite with HMR
- Deployment: GitHub Pages (auto-deploy on push)

## 🎯 **Non-Coder Development Workflow**

### **Working with AI Agents - IMPORTANT GUIDELINES**

**⚠️ AGENT AWARENESS:**
- **User is non-coder**: Explain technical concepts simply
- **User suggestions may be wrong**: Always analyze requests before implementing
- **Don't blindly follow**: Validate suggestions against project architecture
- **Project-specific analysis**: Consider Word Hacker 404's specific needs and structure
- **Cross-project contamination**: NEVER mix with BongBari or other project patterns

**🤝 COLLABORATION TONE:**
- **Be patient and educational**: Explain why certain approaches work better
- **Offer alternatives**: "Your idea could work, but here's a better approach because..."
- **Validate before acting**: "Let me check if this fits our project structure first"
- **Be honest about limitations**: "This might cause issues because..."
- **Guide toward best practices**: Suggest improvements while respecting user goals

## 🚀 **Development Setup & Workflow**

### **Starting Local Development (Every Time)**

**📁 Navigate to Project:**
```powershell
cd "D:\A scret project\Word hacker 404"


**🔧 Install Dependencies (if needed):**
```powershell
npm install
```

**🌐 Start Development Server:**
```powershell
npm run dev
```
- **URL**: `http://localhost:3001` (or next available port)
- **Auto-reload**: Changes reflect immediately
- **Separate from BongBari**: Won't interfere with other projects

**✅ Verify Everything Works:**
- Check TypeScript: `npm run type-check`
- Test build: `npm run build`
- Run development: `npm run dev`

### **Development Commands Reference**

```powershell
# Essential Commands
npm run dev          # Start development server (port 3001)
npm run build        # Create production build
npm run preview      # Preview production build
npm run type-check   # TypeScript validation
npm run lint         # Code quality check

# Git Workflow
git add .                                    # Stage changes
git commit -m "feat: add new feature"       # Commit with message
git push                                     # Deploy to live site automatically

# Troubleshooting
npm ci                    # Clean install if issues
rm -rf node_modules && npm install  # Full dependency reset
```

## 🏗️ **Project Architecture**

### **File Structure (Critical for Agents)**
```
Word Hacker 404/
├── .github/
│   ├── workflows/deploy.yml     # Auto-deployment to GitHub Pages
│   └── copilot-instructions.md  # This file
├── src/
│   ├── App.tsx                  # Main application component
│   ├── App.css                  # Application styles
│   ├── components/MatrixRain.tsx# Canvas Matrix code rain background
│   ├── main.tsx                 # Application entry point
│   └── index.css                # Global styles
├── package.json                 # Dependencies and scripts
├── vite.config.ts              # Vite configuration (GitHub Pages)
├── tsconfig.json               # TypeScript configuration
├── index.html                  # HTML template
└── README.md                   # Project documentation
```

### **Key Configuration Files**

**vite.config.ts — CRITICAL SETTINGS (choose ONE):**
```typescript
// Project Pages (served at https://pramsss108.github.io/word-hacker-404/)
// Use this when NO custom domain is attached
base: '/word-hacker-404/',

// Custom Domain (served at https://wordhacker404.me)
// Use this when a custom domain is active
base: '/',

server: { port: 3000 },
build: { outDir: 'dist' }
```
Notes:
- Current production uses a custom domain → base MUST be '/'.
- If you ever disable the custom domain and fall back to the project URL, switch base back to '/word-hacker-404/'.

**package.json - ESSENTIAL SCRIPTS:**
- `dev`: Development server
- `build`: Production build for deployment
- `type-check`: TypeScript validation

## 🚀 **Auto-Deployment System**

### **How Deployment Works**
1. **Push to main branch** → **GitHub Actions triggers**
2. **Runs build process** → **Deploys to GitHub Pages**
3. **Live site updates** → **Available at https://wordhacker404.me/**

### **Deployment Workflow (.github/workflows/deploy.yml)**
- **Trigger**: Every push to main
- **Process**: Install → Build → Deploy to gh-pages branch
- **Result**: Live site automatically updated
- **Time**: 2-3 minutes for deployment completion

### **Live Site Management**
- **URL**: `https://wordhacker404.me/`
- **Privacy**: Repository private, site public via link
- **Updates**: Automatic on every push
- **Status**: Check GitHub Actions tab for deployment status

### Custom Domain Playbook — Namecheap + GitHub Pages (Authoritative)

Use this when pointing `wordhacker404.me` to this repo.

1) DNS (Namecheap)
- A records (Host `@`) to GitHub Pages IPs:
	- 185.199.108.153
	- 185.199.109.153
	- 185.199.110.153
	- 185.199.111.153
- CNAME record: Host `www` → `pramsss108.github.io`

2) Repository (this project)
- Pages Source: `gh-pages` branch, root
- CNAME file: Create in the PUBLISHED branch (gh-pages), content:
	- `wordhacker404.me`
- Vite base: `/` (custom domain)

3) GitHub Settings → Pages
- Custom domain: `wordhacker404.me`
- Wait for DNS check successful → then enable "Enforce HTTPS"

4) Verification
- Test both: `https://wordhacker404.me` and `https://www.wordhacker404.me`
- If you see a white screen or missing assets, confirm Vite `base: '/'` and that `index.html` references `/assets/...` correctly.

Guardrails (Do NOT do these):
- Do NOT create or keep a `Pramsss108.github.io` repo unless intentionally migrating to a user site. It will compete for the custom domain and cause the "domain already taken" error.
- Do NOT point a CNAME `www → wordhacker404.me` and ALSO `www → pramsss108.github.io` at the same time. Keep only one `www` CNAME.
- Do NOT put the CNAME only on the `main` branch; it must exist on the published branch (`gh-pages`).
- Do NOT set `base: '/word-hacker-404/'` while serving from a custom domain; it will cause a blank page due to broken asset paths.

## 🎮 **Game Features & Architecture**

### Branding Brief — Mood, Voice, Audience
- Mood: underground lab, cyberpunk, analog hacker terminal
- Voice: calm, teasing, slightly philosophical, streetwise. Short sentences.
- Goal: curiosity first → emotion → play
- Audience: Bengali-first, youth, Instagram natives. Mobile hungry.
- Tone rules: edgy but not gratuitous. Decode, not glorify.

### Visual Identity (Final)
- Primary black: `#0b0b0d`
- Deep violet gradient (hero): `#2b0f4a → #21102b`
- Neon green accent: `#0aff6a` (active, badges, glows)
- Matrix micro-accent: `#07c06b` (tiny details, labels)
- Glitch red: `#d92e2e` (alerts, quick flash)
- Text primary: `#e9eef6` | Muted: `#9aa3b2`

### Typography
- Headlines/Body: Inter (400/600/800)
- Terminal bits: JetBrains Mono (400/600)
- Sizing: mobile H1 ≈ 2.0–2.4rem, desktop H1 ≈ 3.0–3.75rem

### Homepage Architecture (Mobile-first)
1. System bar (sticky): access status, time, build label
2. Hero: terminal-style title (Bangla + English), 2-line subtitle, CTAs
	- Primary: Decode Now (scrolls to Featured Decodes)
	- Secondary: Open Dictionary (scrolls to dictionary)
	- Typing + blinking cursor intro, reduced-motion aware
3. Tools strip (horizontal): Sound Lab, Slang Scanner, Voice Encryptor, Private Drops
4. Game Modes: Word Detective (live), others (soon) — glass cards
5. Featured Decodes (carousel): 3 recent decodes with tone badges; taboo = quick red flash
6. Slang Dictionary (quick search): input, language tags, sample entries with tone badges
7. How it works: access → decode → reflect → submit word
8. Callout: Private drops (Telegram placeholder)
9. Footer: minimal text + terminal log label

### Interactions & Motion
- Neon glows, subtle lift on hover/tap, glass surfaces
- Matrix code rain: battery-friendly canvas, pauses when hidden, respects reduced motion
- Progressive reveal animations; no heavy libraries; CSS + light TS only

### Accessibility & Performance
- High-contrast text on dark gradients
- Large tap targets; mobile-first layout
- `prefers-reduced-motion` respected globally
- Fonts via Google Fonts; lightweight icons (Lucide)

### Implemented Files (Key)
- `index.html`: Inter + JetBrains Mono, updated meta/theme-color
- `src/index.css`: design tokens, animated aurora, scanlines, utilities, buttons, glass
- `src/App.tsx`: full homepage sections + maintained game switching
- `src/App.css`: hero, system bar, tools strip, carousel, dictionary, steps, badges
- `src/components/MatrixRain.tsx`: canvas-based background effect
- `src/vite-env.d.ts`: CSS import typing

## 🔧 **Agent Development Guidelines**

### **Before Making Changes**
1. **Understand the request**: Ask clarifying questions if unclear
2. **Analyze project impact**: Consider how changes affect existing code
3. **Check dependencies**: Ensure new features don't conflict
4. **Validate with user**: Explain approach before implementing
5. **Test thoroughly**: Run type-check and build before pushing

### **Code Quality Standards**
- **TypeScript**: Maintain strict typing for all components
- **React patterns**: Use functional components with hooks
- **CSS organization**: Keep styles modular and maintainable
- **Performance**: Optimize for fast loading and smooth interactions
- **Accessibility**: Ensure keyboard navigation and screen reader support

### **Common Non-Coder Requests & Responses**

- “Make it more hacker”: Use neon glows, glitch micro-anim, MatrixRain, but respect reduced motion.
- “Mobile first”: Favor stacked layouts, horizontal scrollers, big CTAs, minimal text.
- “Add AI later”: Keep components modular; no server/api wiring yet (client-only now).

### **Red Flags to Watch For**
- ❌ Copying from other repos (BongBari or others)
- ❌ Breaking TS build or Vite config
- ❌ Adding backends, DBs, or server-side code (client-only project)
- ❌ Swapping to Tailwind/Next/SSR; keep plain CSS + React
- ❌ Heavy animation libs (prefer CSS + tiny TS)

## 🚨 **Emergency Troubleshooting**

### **Site Not Loading After Push**
1. **Check GitHub Actions**: Look for failed deployments
2. **Verify build**: Run `npm run build` locally
3. **Check console**: Browser DevTools for errors
4. **Force refresh**: Ctrl+F5 to clear cache

### **Development Server Issues**
1. **Port conflicts**: Vite will auto-select available port
2. **Dependency issues**: Run `npm ci` for clean install
3. **TypeScript errors**: Fix before proceeding with features
4. **Cache problems**: Clear browser cache and restart dev server

### **Deployment Failures**
1. **Check workflow permissions**: GitHub Actions needs write access
2. **Verify gh-pages branch**: Should be auto-created by workflow
3. **Build errors**: Fix TypeScript/build issues first
4. **Repository settings**: Ensure GitHub Pages points to gh-pages branch

### Troubleshooting Custom Domains (Fast Reference)
- Error: "custom domain is already taken by another repository"
	- Cause: Another repo (commonly `Pramsss108.github.io`) has the same domain set
	- Fix: Remove the domain from the other repo (Settings → Pages → clear custom domain) or delete that repo if unused
- Blank white page after enabling domain
	- Cause: Vite base mismatch
	- Fix: Set `base: '/'`, rebuild, redeploy; ensure gh-pages has CNAME
- 404 at root but subpath works
	- Cause: Domain not bound to current published branch or caching
	- Fix: Ensure CNAME exists on `gh-pages`; wait a few minutes; hard refresh (Ctrl+F5)

## 🎯 **Future (Client-Only) Roadmap**

- Glitch headline loop toggle and haptic tap (Vibration API)
- Optional “FX” toggle (animations/sound) in system bar
- Social preview image and share microcopy
- Expand dictionary sample set and tone badges
- Lottie only if strictly needed, lazy-loaded

## 💡 **Agent Collaboration Best Practices**

### **Communication Style**
- **Be educational**: Explain technical decisions
- **Offer choices**: Present multiple solutions with pros/cons
- **Validate understanding**: Confirm user intentions before implementing
- **Document changes**: Update this file when adding major features
- **Stay project-focused**: Keep solutions specific to Word Hacker 404's needs

### **Development Philosophy**
- **User-centric**: Prioritize user experience over technical complexity
- **Maintainable**: Write code that's easy to understand and modify
- **Scalable**: Design for future feature additions
- **Reliable**: Ensure stability before adding new functionality
- **Documented**: Keep instructions updated for future agents

---

**Last Updated**: October 17, 2025 — Branding v1 + homepage revamp + MatrixRain
**Status**: Production ready with auto-deployment active (client-only)
**Live Site**: https://wordhacker404.me/

**Constraints**: GitHub Pages only, no backend/DB, client-side features only, keep dependencies light.

---

Quick Dev Reference
- Start: `npm run dev`
- Type-check: `npm run type-check`
- Build: `npm run build`
- Preview build: `npm run preview`