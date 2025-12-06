# Replica Studio IDE — Build Roadmap ✅🚧

## Phase 0 · Environment & Baseline
- [x] Vite + Next.js app boots on `http://localhost:3001`
- [x] VS Code–style shell scaffolded (header, status bar, Tailwind tokens)
- [x] Monaco editor + xterm terminal integrated without runtime errors
- [x] Remotion player mounted with placeholder 3D content
- [x] TypeScript passes (`npm run type-check`)
- [ ] `npm run build` smoke-test

---

## Phase 1 · “Black Screen” Panel Hardening ✅
_File:_ `replica-studio/src/app/page.tsx`
1. Force root container to `className="h-screen w-screen overflow-hidden bg-[#1e1e1e] text-white flex flex-col"`.
2. Implement 4 visible panes inside `ResizablePanelGroup`:
   - **Explorer (left):** hard-coded tree listing; ensure `h-full` + border-right.
   - **Editor (center):** `<CodeEditor>` with default JSON `{ "project": "Replica Studio", "status": "Ready" }`.
   - **Preview (right):** `<Player>` inside bordered div; wrap Remotion `AbsoluteFill` so canvas scales.
   - **Terminal (bottom):** min-height `h-32`, xterm instance or mocked console text.
3. Confirm CSS for `react-resizable-panels` is loaded (`panel borders`, `resize cursors`).
- [x] Explorer block rendered
- [x] Editor shows seeded JSON
- [x] Preview shows Remotion player frame
- [x] Terminal visible with logs

---

## Phase 2 · Universal 3D Engine Injection ✅
_New file:_ `replica-studio/src/remotion/UniversalComposition.tsx`
1. Accept `sceneConfig` prop and render:
   - `<ThreeCanvas>` (`@remotion/three`).
   - `<DynamicModel url={sceneConfig.model}>` using `useGLTF`.
   - `<LightingSetup type={sceneConfig.lighting}>`.
   - `<CameraRig type={sceneConfig.camera}>` tied to `useCurrentFrame`.
2. Overlay layer: map `sceneConfig.overlays` to HUD components (e.g., `<NeonLine>`, `<DataTag>`).
3. Update `replica-studio/remotion/RemotionRoot.tsx`:
   - Register `"MainScene"` composition.
   - Pass current Monaco JSON via `inputProps`.
4. Loading states: fallback wireframe mesh while GLB fetches.
- [x] UniversalComposition created
- [x] `RemotionRoot` wired to editor state
- [x] Loading fallback renders

---

## Phase 3 · Terminal “Brain” Wiring ✅
_File:_ `replica-studio/src/components/ide/Terminal.tsx` & `src/app/page.tsx`
1. In Terminal component:
   - Capture `Enter` submissions.
   - Emit command string upwards.
2. In page:
   - Implement `handleCommand(input)`:
     - `generate "<topic>"`: log progress, call `getMockScene(topic)`, stream JSON to Monaco (character-by-character), update Remotion props.
     - `render`: log queue + export messages (mocked).
3. Mock data:
   - `"cow"` → cow scene JSON
   - `"human"` → human skeleton JSON
   - default → rotating cube JSON
4. Terminal logs should show each step; Monaco + Player update in sync.
- [x] Command parser working
- [x] Streaming writer hooked to editor
- [x] Mock scene variants returned

---

## Phase 4 · Rendering & Export Path ✅
1. Connect `render` command to Remotion render pipeline (CLI or server API).
2. Display job status in terminal + explorer (e.g., `/out/video.mp4` link).
3. Optional: add queue panel showing job history.
- [x] Render command triggers real MP4 export
- [x] Output surfaced in UI
- [x] Queue panel for job history

---

## Phase 5 · Polish & QA
- [ ] Fill explorer with real scene files, badges.
- [ ] Inspector controls mutate active scene (position, lighting, overlays).
- [x] Add transport controls (play/pause, scrub) for Remotion player.
- [x] Wire Gemini operator chat + API helper.
- [ ] Expand “Featured Decodes” & dictionary sections from branding brief.
- [ ] Accessibility & reduced-motion audit.
- [ ] `npm run build` and end-to-end smoke.

---

### Quick Reference
- Dev server: `npm run dev` (port 3001)
- Type-check: `npm run type-check`
- Build: `npm run build`
- Key directories:
  - `src/app/page.tsx` — IDE layout + state
  - `src/components/ide/*` — Monaco, Terminal, etc.
  - `src/remotion/*` — compositions & scene logic
  - `src/services/asset-map.ts` — GLB asset resolver

Keep this doc updated (check off items as you finish each bullet) so everyone sees what’s done vs pending before client delivery.
