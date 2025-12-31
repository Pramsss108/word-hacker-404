# AIEditor / Vectorizer Revamp — Implementation Plan (Step-by-step)

Goal
- Replace the existing fragmented flow with a single-window, robust, testable pipeline: Generate → Fetch Blob → Vectorize (worker) → Preview → Download.
- Make the system resilient to CORS/adblock failures, and include a Master DebugHub for rapid diagnostics.

Branching & Workflow
1. Create feature branch
   - Branch name: `feature/aieditor-refactor`
   - Work locally and push frequent commits; open a draft PR early.

Commands
```bash
# create branch
git checkout -b feature/aieditor-refactor
# run dev server
npm install
npm run dev
# type check
npm run type-check
```

High-level Implementation Steps (developer-friendly)

Step 1 — Add `AIEditor` composite component (single-window)
- Create `src/components/AIEditor.tsx`.
- Structure:
  - Top: Prompt controls (input, preset, Generate button).
  - Middle: Gallery of generated images (thumbnails).
  - Bottom: Vector preview area with compare slider, zoom, and action buttons (Vectorize, Download SVG/PDF).
- Keep `CyberCanvas` and `VectorCommandCenter` logic but refactor them into smaller helper hooks/components and import into `AIEditor`.

Step 2 — Robust image loader (fetch->blob->createObjectURL)
- Create `src/utils/imageLoader.ts` with helper:
```ts
export async function loadImageAsObjectURL(url: string) {
  const resp = await fetch(url, { mode: 'cors' });
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
  const blob = await resp.blob();
  return URL.createObjectURL(blob);
}
```
- Use this everywhere images are used for further processing (vectorization). This avoids CORS issues when reading pixel data from canvas.
- When loading for display only, still prefer the object URL so same-origin rules are satisfied.

Step 3 — Vectorization: supply ImageData to worker
- Update `runVectorization` to accept an object URL.
- Implementation pattern:
  - Create an `Image()` object and set `crossOrigin = 'Anonymous'`.
  - `await` image load, draw to an offscreen canvas sized to image natural width/height.
  - `const imageData = ctx.getImageData(0,0,w,h);`
  - Send `{ imageData, options }` to `vectorizer.worker.ts` via `postMessage`.
- Keep `vectorizer.worker.ts` with ImageTracer usage unchanged, since it expects `ImageData`.

Step 4 — UI: Vector preview + controls
- Embed the compare slider, zoom controls, and the following toggles near the preview:
  - `Invert Preview` (toggle)
  - `Auto Accent` (toggle)
  - Accent color swatch (click opens a color picker)
- Use `localStorage` to persist user choices. Example keys: `vcc:autoAccent`, `vcc:accentColor`.

Step 5 — DebugHub & Diagnostics
- Keep `src/components/DebugHub.tsx` (already added).
- Ensure components `AIEditor`, `CyberCanvas`, and `VectorCommandCenter` publish meaningful snapshots/events to `window.__DEBUG_HUB__`:
  - `AIEditor` publishes: `prompt`, `generatedImages` (array of object URLs), `lastError`.
  - `Vectorizer` publishes: `originalImage`, `svgOutput`, `workerStatus`, `lastError`.
- Add structured `log()` calls for important stages: request start, fetch success/failure, worker started, worker success/failure.

Step 6 — Failures & user guidance
- For all network/fetch failures show a clear toast/modal describing:
  - "Image failed to load — try disabling ad-blockers or try a different model param (model=flux)."
  - Provide "Retry" and "Copy Debug Info" actions.
- When worker fails, show the first lines of error and a "Dump to console" button.

Step 7 — Tests (integration)
- Create a test script `scripts/integration-test.js` for a dev-only integration test that:
  - Hits the generator to get an image URL (simulate user prompt),
  - Fetches → blob → object URL,
  - Draws to canvas and invokes the worker (use `worker.postMessage` in node via `jsdom` or run in browser automation),
  - Verifies SVG string is returned.

Step 8 — Accessibility & UX polish
- Ensure input focus, visible focus outlines, and `pointer-events` are set appropriately so canvas doesn't block inputs.
- Ensure `MatrixRain` uses `pointer-events: none` (already in CSS) and `z-index` layering is consistent.

Step 9 — CI and PR checklist
- Before merging run:
```bash
npm run type-check
npm run lint
npm run build
# run integration test in a headless browser if set up
node scripts/integration-test.js
```
- PR checklist:
  - Branch: `feature/aieditor-refactor`
  - Description of changes + screenshots
  - List of manual QA steps
  - Tests added / updated

Code snippets & examples

1) Fetch -> blob -> createObjectURL (utility)
```ts
export async function fetchToObjectURL(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
```

2) Convert objectURL -> ImageData for worker
```ts
async function objectUrlToImageData(objectUrl: string) {
  return new Promise<ImageData>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No 2D context'));
      ctx.drawImage(img, 0, 0);
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (e) => reject(new Error('Image load failed'));
    img.src = objectUrl;
  });
}
```

3) Worker communication pattern (main thread)
```ts
const worker = new VectorizerWorker();
worker.onmessage = (e) => {
  if (e.data.type === 'success') handleSvg(e.data.svg);
  else handleWorkerError(e.data.error);
};
worker.postMessage({ imageData, options });
```

Rollout guidance
- Merge to `main` only after manual QA and CI passing.
- Tag release as `v2.1.0-vectorizer-refactor` and deploy to gh-pages or the usual deployment pipeline.

Troubleshooting notes (for users & devs)
- If images fail intermittently, check ad-blockers and test `curl`/`Invoke-WebRequest` to `https://image.pollinations.ai/prompt/test?nologo=true` and verify `Access-Control-Allow-Origin`.
- If worker fails, open Developer Tools → Console for error stack; use the Master DebugHub `Dump` to capture runtime snapshot and include in issue.

Estimated timeline (small team)
- 1 day: `AIEditor` scaffold + simple UI wiring
- 1 day: Implement fetch->blob flow and worker data path
- 1 day: Add DebugHub improvements and polish toggles
- 1 day: Tests + QA + PR polishing

---

If you want I'll start implementing Step 1 (create `AIEditor` and wire current components into it) and open the feature branch. I will commit incrementally and update the TODO list entries as I progress.
