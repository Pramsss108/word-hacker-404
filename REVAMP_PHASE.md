# Vectorizer & CyberCanvas Revamp — Phase Plan

Goals
- Make the AI image generation + vectorization flow simple, reliable, and single-window.
- Fix UX regressions: unclickable inputs, invisible (dark) SVG previews, and flaky external image loading.
- Ensure Pollinations.ai integration works on the free tier with robust CORS handling and fallbacks.

High-level changes (phase 1)
1. Single-window workflow
   - Collapse `CyberCanvas` and `VectorCommandCenter` into one screen mode (tabs or collapsible panels) so users never feel "lost".
   - Keep controls (prompt, preset, generate) at the top, gallery in the middle, and vector preview at the bottom.
2. Robust Pollinations integration
   - Use `https://image.pollinations.ai/prompt/...` with `model=flux` and `nologo=true` as default.
   - Always load images via `fetch()` -> `blob` -> `createObjectURL()` to avoid CORS when downstream code needs to read pixels.
   - Add explicit `crossOrigin="anonymous"` to `<img>` elements when using remote URLs.
3. Vectorization reliability
   - Pre-fetch remote images as blobs, then draw to an offscreen canvas for the tracer worker.
   - Provide clear user feedback for failures (network, CORS, worker errors) with actionable suggestions.
4. SVG visibility & UX
   - Auto-detect dark SVG fills and either invert the preview or apply a bright accent color (configurable) in the debug UI.
   - Add a persistent toggle next to zoom for "Auto Accent" and a small color swatch for quick changes.
5. Simplify header/menus
   - Remove modal/popover duplication. Keep a single top-level nav; avoid nested modal context switches when possible.

Implementation checklist (Phase 1)
- [ ] Audit current flow: `src/components/CyberCanvas.tsx`, `src/components/VectorCommandCenter.tsx` (entry points and callbacks)
- [ ] Implement single-window layout (refactor components into `AIEditor` composed view)
- [ ] Replace Pollinations image load with `fetch` -> `blob` -> `URL.createObjectURL` patterns
- [ ] Keep worker-based vectorization (`src/workers/vectorizer.worker.ts`) but feed it ImageData from a controlled canvas
- [ ] Add visible UI toggles for `Auto Accent` and preview `Invert` next to zoom controls
- [ ] Persist preferences (`localStorage`) and surface a minimal Settings section
- [ ] Add integration test: generate -> blob fetch -> vectorize -> preview -> download

Quick developer notes
- Vector tracer: `imagetracerjs` is run inside `vectorizer.worker.ts` and expects an `ImageData` object.
- Avoid loading images by direct `<img src="https://...">` where downstream pixel access is needed.
- Browser security: some extension/adblockers may block `image.pollinations.ai`; document this in the troubleshooting section.

Commands for local testing
```powershell
# start dev server
npm install
npm run dev
# run type checks
npm run type-check
# build for production
npm run build
```

Troubleshooting guide (user-facing)
- If image load fails: disable ad-blockers, retry; if still failing, try switching model param (`model=flux` or `model=any-dark`).
- If vectorization fails: open the Debugger (top-right), click "Dump State to Console", copy debug info and share.
- If SVG looks invisible: use "Invert SVG Preview" or "Auto Accent" in the Debugger.

Next steps (Phase 2)
- Refactor into smaller components and add unit tests for the image loader and worker interface.
- Add an opt-in server-side proxy for Pollinations to avoid CORS and adblock interference (optional).

Contact
- When ready I can implement phase 1 changes incrementally: pick one item (e.g., single-window UI) and I'll make the code edits and tests.
