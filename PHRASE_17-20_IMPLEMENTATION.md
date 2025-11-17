# PHRASE 17–20 Delivery Notes ✅

## PHRASE 17 — Memory Limits & Progressive Fallback
- Added `deviceCapabilityService` with `navigator.deviceMemory` detection, Web API feature scan, and memory-plan math.
- `RawImageConverter` now scores each RAW file before demosaic:
  - `<2GB` → **Preview-only** guard with friendly error + CTA.
  - Tight budgets trigger automatic downscale in the worker (crop-first, rotate-second preserved).
  - UI banner exposes live recommendation + simulation dropdown (Auto / 1.5GB / 3GB / 6GB) for QA—select 1.5GB to verify preview-only path immediately.
- Worker demosaic now accepts `downscaleFactor`/`maxMegapixels`, applies nearest-neighbor reduction before transferring back to main thread (prevents massive buffers in UI/export).

## PHRASE 18 — Cross-Origin Isolation & Headers
- Dev/preview servers ship the required headers automatically via `vite.config.ts`:
  ```json
  {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp"
  }
  ```
- **Static server / Nginx:**
  ```nginx
  add_header Cross-Origin-Opener-Policy "same-origin" always;
  add_header Cross-Origin-Embedder-Policy "require-corp" always;
  ```
- **Netlify `_headers`:**
  ```
  /*
    Cross-Origin-Opener-Policy: same-origin
    Cross-Origin-Embedder-Policy: require-corp
  ```
- **Vercel (`vercel.json`):**
  ```json
  {
    "headers": [
      {
        "source": "/(.*)",
        "headers": [
          { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
          { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
        ]
      }
    ]
  }
  ```
- **Verification:** run `npm run dev`, open DevTools → Console → `crossOriginIsolated` now `true`; `SharedArrayBuffer` accessible for worker shared memory + WASM shared heaps.

## PHRASE 19 — Lazy TF.js + Model Bundles
- Removed eager `aiEngine` singleton; `aiModelLoader` dynamically imports both `@tensorflow/tfjs` and `AIVocalShieldEngine` only when an AI feature toggles on.
- `AIModelSize` selector (Tiny/Medium/Large) sits below the AI Enhancement slider. Network tab now shows `models/ai/<size>/model.json` downloads **only after** enabling AI + choosing size.
- `audioService` routes every AI step (enhance + mastering) through the loader; failures gracefully fall back to CPU enhancement.

## PHRASE 20 — Capability Detection & UX
- New capability banner (above the converter workspace) surfaces:
  - Memory tier, SharedArrayBuffer, WebGL2, WebGPU, WebCodecs status chips.
  - Live pipeline recommendation text + memory-plan badge.
  - Manual override dropdown for QA (see PH17 test above).
- Fast/Full mode select now disables full decode automatically if the scanner flags preview-only devices, and calls out when reduced-resolution auto-downscale is active.

## Quick Tests
1. **Memory fallback:** set dropdown → `1.5 GB (low)` → import RAW → banner flips to Preview-only, Full RAW option locks, error toast instructs Fast Preview.
2. **Headers:** run `npm run dev`, check DevTools console → `SharedArrayBuffer` is defined, `crossOriginIsolated === true`.
3. **AI lazy-load:** open Network tab, enable *AI Enhancement* → watch `@tensorflow/tfjs` + `/models/ai/<size>/model.json` stream in only after toggle. Switch Tiny/Medium/Large to verify different weight files.
4. **Capability chips:** toggle WebGL in browser flags (or use Safari dev tools) and refresh to see banner warnings adjust automatically.

_All code paths remain client-only, deploy-ready for GitHub Pages / custom domain (`wordhacker404.me`)._
