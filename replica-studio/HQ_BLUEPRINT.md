# Replica Studio HQ Blueprint

## 1. Product Mindset (Think Like the User)
- **Core emotion:** "I am inside a pro lab where AI and motion artists co-build"—no toy vibes.
- **Primary jobs-to-be-done:**
  1. Sketch a narration in plain language and watch scenes evolve live.
  2. Iterate on lighting/motion cues without touching raw code.
  3. Queue pristine exports fast when the director says "ship now".
- **Guardrails:** zero clutter, tactile feedback, branded neon discipline, frictionless handoff from idea → preview → export.

## 2. UI Structure (A → Z)
| Layer | Purpose | Notes |
| --- | --- | --- |
| **A. System Bar** | Status pulse, clock, connection badge. | Sticky, 48px, shows agent health + active scene set. |
| **B. Explorer Rail** | Project tree, drops, pipelines. | Collapsible, badges for live/frozen assets, quick actions ("+ scene"). |
| **C. Ops Ribbon** | Context toggles (Modes, Colorway, FX). | Thin strip under bar; hosts reduced-motion + sync status. |
| **D. Stage Stack** | Dual grid: (1) Remotion viewport (16:9) (2) JSON/Graph editor. | Shared transport, scrubber anchored under viewport, timeline marks. |
| **E. Insight Tiles** | Render queue, diagnostics, FPS meter. | Default on right rail; each tile glassmorphic with badge. |
| **F. Ops Chat** | Gemini Ops + thread controls. | Lives under Insight Tiles, supports slash commands, mentions. |
| **G. Command Trench** | Agent terminal + log gutter. | Docked bottom 200px, handles generate/render/diagnose verbs. |
| **H. Toast Layer** | Top-right stack; confirmations + errors. | Auto-dismiss, color-coded to brand palette. |
| **I. Background Systems** | Matrix rain + adaptive aurora. | Pausable via FX toggle, respects reduced-motion. |

## 3. Functional Flow
1. **Brief Intake**
   - User drops text ("decode solar storm") inside Ops Chat or Command Trench.
   - System tags topic, seeds scene templates, updates Explorer.
2. **Scene Authoring**
   - CodeEditor hosts JSON + soon Graph mode.
   - Parser validates in real time, surfaces overlay issues inline.
3. **Preview Control**
   - PlayerRef maintains play/pause, frame scrub, safe reset.
   - Frame listener updates HUD + transport.
4. **Assist Loops**
   - Gemini suggestions annotate Editor diffs.
   - Chat threads snap to Explorer node (context chips).
5. **Validation**
   - Diagnostics cards show duration, missing assets, fps, render health.
6. **Render + Export**
   - Queue accepts manual button or `render` command.
   - Jobs move through pending → rendering → completed; links surfaced in queue + toast.

## 4. Export Pipeline (Zero → Hero)
1. **Scene Prep**
   - Normalize user JSON via `extractScenesFromJson`.
   - Enforce FPS, camera, overlay schema before hitting renderer.
2. **Job Submission**
   - POST `/api/render` with sanitized payload.
   - Temp job ID mirrored instantly in queue.
3. **Bundling**
   - `@remotion/bundler` packages `/remotion` compositions on-demand (cached serve URL).
4. **Render Execution**
   - `renderMedia` (h264) writes to `public/renders/<job>.mp4`.
   - Hooks feed progress back to logs (future enhancement).
5. **Delivery**
   - Queue swaps temp ID for final job ID, attaches link.
   - Terminal + toast announce completion; Explorer auto-add (optional future).
6. **Archive & Share**
   - Metadata appended to "renders" folder node.
   - Future: webhook or Telegram drop triggered from same metadata.

## 5. Quality + Observability
- **Type safety:** Strict typing for scenes, overlays, render responses.
- **Runtime feedback:** Inline editor warnings, chat failure fallbacks, terminal log levels.
- **Reduced-motion:** Canvas + glow effects honor OS preference + FX toggle.
- **Actions audit:** Command trench keeps scrollback for last 50 events.
- **Testing priorities:**
  - Parser unit snapshots per schema variant.
  - API route integration (chat/render) with mock envs.
  - UI smoke via Playwright once layout stabilizes.

## 6. Ready-To-Build Checklist
1. Finalize layout scaffolding (panels + ribbons).
2. Wire ops ribbon + diagnostics tiles.
3. Expand explorer data model (drops, pipelines, renders).
4. Add render progress reporting + toasts.
5. Hook share targets (Telegram placeholder) post-export.
6. Harden type-check (Next config + Remotion declarations).

---
**That’s it. Let’s pause the production.**
