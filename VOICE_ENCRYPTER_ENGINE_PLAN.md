# Voice Encrypter — Engine Revamp Plan (Client‑Only)

Status: Draft v0.2 (2025‑10‑18)
Owner: You + AI Agent
Scope: Voice Encrypter only (preview + export). No backend.

## Vision
Build a DAW‑like, fail‑proof, client‑side vocal enhancer + effects mixer with live preview (Cakewalk/FL style) and identical offline export. Users can:
- Upload/preview their voice
- Toggle individual effects (AI Enhancement is just one of them)
- One‑click Enhance (smart chain)
- Optionally "Encrypt" by combining chosen effects
- Export WAV

## Constraints & Non‑Goals
- 100% client‑side, no backend, no cloud inference.
- Stack is fixed: React + TypeScript + Vite. No Tailwind; use existing CSS only.
- Keep Vite `base` for GitHub Pages untouched. Do not add server code.
- Keep dependencies light; heavy ML/WASM is optional and lazy‑loaded only.
- Privacy first: no external calls, user consent before recording.

## Foundations (What we’re building first)
- Separate pipelines:
  - Preview Graph (real‑time): AudioContext → Nodes → Destination
  - Render Graph (offline): OfflineAudioContext → Nodes → WAV
- Small, composable nodes; no recursion; chunked work with yields
- Per‑effect try/catch; pipeline never crashes
- AB compare (Original vs Processed) in preview
- Identical settings between preview and render

## Libraries & Decisions
Already installed:
- @tensorflow/tfjs — future AI enhancement (lazy‑loaded)
- tone — optional for quick DSP nodes & param automation
- meyda — analysis features to drive adaptive filters/gates
- wavesurfer.js — waveform + region preview
- standardized-audio-context — consistent AudioContext
- audio-buffer-utils, ml-matrix, web-audio-beat-detector — helpers

Optional (Phase 3/4):
- kissfft‑wasm (or fft.js) — reliable FFT without recursion
- rnnoise‑wasm — state‑of‑the‑art classical denoiser (client‑only)
 - ffmpeg.wasm — optional MP3 export; we already have WAV via WebAudio

Not using:
- Tailwind CSS (project uses handcrafted CSS)
- Howler.js (WaveSurfer + native audio is enough)

## Architecture
### 1) Engine Core (new)
File: `src/services/engineCore.ts`
- buildPreviewGraph(ctx, source, settings) → { nodes, connect(), disconnect(), updateParams() }
- renderOffline(buffer, settings, onProgress?) → AudioBuffer
- Node factories: createHPF, createLPF, createComp, createLimiter, createDelay, createReverb, createMeter
- Contracts:
  - Node has input/output (AudioNode), setParams(partial), dispose()
  - All nodes pure WebAudio API (Tone optional wrapper only)
  - No recursion; no ScriptProcessor; consider AudioWorklet only after M1

### 2) Settings & Presets
- EffectSettings stays the single source of truth
- Presets: Clean, Podcast, Studio, HideID (encrypt flavor), Custom
- One‑Click Enhance = map preset → enable nodes with sane defaults

### 3) Error Model & Guards
- If AudioContext suspended → resume once on user gesture
- If any node throws → bypass that node, warn, continue
- Always yield between long tasks: `await new Promise(r => setTimeout(r, 0))`
- If no effects enabled → shortcut return original buffer

### 4) Effects Coverage (phased)
- Baseline: HPF, LPF, Compressor, Delay, Reverb, Limiter, Meter
- Cleaning: adaptive noise reduction (non‑AI bands/expanders)
- Enhancement: EQ tilt, de‑esser (simple band comp), gentle exciter
- Encrypt Modes: pitch shift, formant warp, bitcrush, modulation, stereo widen, subtle glitch

## Milestones (step‑by‑step, no‑fail)

### M1 — Core skeleton (preview + export)
- [ ] Create `engineCore.ts` with:
  - [ ] preview graph: source → HPF → LPF → Comp → (Delay, Reverb) → Limiter → meter
  - [ ] renderOffline mirrors graph with OfflineAudioContext
  - [ ] updateParams/settings mapping
- DoD:
  - [ ] Toggle effects without UI crash
  - [ ] AB compare works
  - [ ] Exported WAV ≈ preview

### M2 — Noise Reduction v1 (non‑AI, adaptive)
- [ ] 3–4 band split with expanders (downward)
- [ ] Drive thresholds from Meyda features (RMS/noise floor)
- [ ] Preview and export parity
- DoD:
  - [ ] Low‑noise voice becomes clearer with minimal artifacts

### M3 — Live Metering & Waveform
- [ ] Output meter + simple loudness estimation
- [ ] WaveSurfer preview + loop selection

### M4 — WASM options (optional but powerful)
- [ ] swap FFT to kissfft‑wasm (if needed)
- [ ] rnnoise‑wasm denoise path as optional toggle

### M5 — AI Enhancement v1 (tfjs, lazy)
- [ ] Small, windowed model; chunked processing; yields between frames
- [ ] Strict guardrails (fallback if init fails)

### M6 — Mastering polish
- [ ] gentle EQ tilt, exciter (optional), limiter to target loudness
- [ ] presets with One‑Click Enhance (Microsoft‑like simplicity)

### M7 — Export & Presets Persistence (optional)
- [ ] WAV export (existing `audioBufferToWavBlob`) verified
- [ ] Optional MP3 export behind toggle if ffmpeg.wasm added
- [ ] Save/load presets to IndexedDB/localForage

### M8 — Offline & QA polish (optional)
- [ ] Reduced‑motion compliance, keyboard nav, high contrast
- [ ] Optional PWA shell caching (Workbox) — models local only
- [ ] Visual/audio regression checks on sample clips

## Tasks & Ownership
- Engine Core: AI Agent
- Settings & Presets: AI Agent (review with you)
- UI wiring: existing `VoiceEncrypter.tsx` (minimal changes)

## Acceptance Criteria (for NASA handoff)
- Zero UI crashes during any toggle or processing
- Preview always responsive; export matches preview
- Effects work individually and in combination
- One‑click Enhance produces consistent, quality uplift
- Code is client‑only, documented, with graceful fallbacks

## Risks & Mitigations
- Long processing → yield between chunks; show progress
- AI model size → lazy load; provide basic enhancer fallback
- Browser differences → use standardized‑audio‑context; feature‑detect

## Testing Matrix (must pass)
- Recording/playback on Desktop Chrome and Android Chrome; iOS Safari playback OK
- Preview latency acceptable (<150ms UI updates)
- One‑Click Enhance improves clarity on most sample clips
- Encrypt presets produce clearly masked voice (A/B check)
- Offline usage (if PWA added): app shell loads after first visit
- Exported WAV plays in common mobile players

## Ethics & Privacy
- Show upfront consent before recording third‑party voices
- Visible disclaimer: do not impersonate; for creative masking only
- Provide “Clear all local data” to delete presets/samples

## Non‑coder Handoff (how Copilot should act)
- Keep changes incremental; one focused commit at a time
- No backend code, no external calls; models, if any, live under `/models`
- Use existing CSS; no Tailwind
- Comment file headers briefly: purpose + how to test locally

## Next Steps
- M1: Implement `engineCore.ts` skeleton
- Wire preview graph to existing UI play/AB controls
- Keep `audioService.ts` for now as export; migrate to engineCore in M1
