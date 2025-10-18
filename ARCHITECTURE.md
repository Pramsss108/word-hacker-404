# Voice Encrypter — ARCHITECTURE (Non‑Coder Friendly)

Status: v1.0 (2025‑10‑18)
Audience: You (non‑coder) + Copilot agent
Scope: Client‑only Voice Encrypter/Enhancer with live preview and export

---

## What we are building
A studio‑style Voice Encrypter that runs entirely in your browser. You can upload or record voice, clean it, enhance it, add effects, mask your identity (encrypt), then export. No servers. No cloud.

Goal: NASA‑grade reliability — simple, fast, and impossible to crash.

---

## Key ideas (in plain words)
- Live preview graph: instant sound while you tweak knobs.
- Offline render graph: makes the final file. It matches the preview.
- Effects are small blocks (filters, compressor, reverb…). We can turn each on/off.
- If any effect fails, we skip it and keep going. No crashes.
- One‑Click Enhance: a preset that makes most voices clearer in one tap.

---

## Constraints (what we must respect)
- Client‑only (no backend)
- React + TypeScript + Vite
- No Tailwind; we use the project’s existing CSS
- Deploys to GitHub Pages; Vite base path stays as configured
- Privacy‑first; no external calls without consent

---

## The moving parts (files)
- UI
  - `src/components/VoiceEncrypter.tsx` — The mixer screen and controls
  - `src/components/MatrixRain.tsx` — Background visuals
- Engine (now)
  - `src/services/audioService.ts` — Current apply‑effects + WAV export
- Engine (new foundation)
  - `src/services/engineCore.ts` — Live preview + offline render (to be added in M1)
- Optional AI
  - `src/services/aiVocalEngine.ts` — Heavy AI, guarded and optional (later phase)
- Docs
  - `VOICE_ENCRYPTER_ENGINE_PLAN.md` — Milestones and acceptance
  - `ARCHITECTURE.md` — This document (how it works, step‑by‑step)

---

## How the sound flows
1) Input: record with microphone or upload a file
2) Decode: turn it into audio we can process
3) Preview: build a live graph → you hear changes instantly
4) Effects: HPF, LPF, Compressor, Delay, Reverb, Limiter, etc.
5) Encrypt (optional): pitch, formant, bitcrush, modulation, widen
6) Export: identical settings, rendered offline → WAV (MP3 optional later)

---

## Libraries we use (installed)
- `@tensorflow/tfjs` — future AI enhancement (lazy)
- `tone` — optional utility around audio nodes
- `meyda` — analysis (RMS, spectral info) for adaptive cleaning
- `wavesurfer.js` — waveform preview
- `standardized-audio-context` — consistent browser audio context
- `audio-buffer-utils`, `ml-matrix`, `web-audio-beat-detector` — helpers

Optional later (only if needed):
- `kissfft-wasm` — fast reliable FFT
- `rnnoise-wasm` — classic denoiser
- `ffmpeg.wasm` — MP3 export (WAV already covered)

We do NOT add Tailwind or Howler.

---

## What “fast” means here
- Live graph uses efficient Web Audio nodes (native speed)
- Long work is split into small chunks (no freezes)
- Optional WASM paths for heavy DSP if required
- AI models load only when turned on (lazy)

---

## Step‑by‑step (you can follow)
1) Run the app locally
   - Install once: `npm install`
   - Start dev: `npm run dev`
   - Open the URL printed in the terminal (Vite picks a free port)

2) Try the Encrypter
   - Open the Voice Encrypter screen
   - Upload a short voice clip
   - Toggle effects on and off; adjust knobs; listen live
   - Click Export → download WAV

3) One‑Click Enhance
   - Turn on the preset; confirm it sounds cleaner
   - Use A/B compare (Original vs Processed)

4) Encrypt
   - Try “Hacker Deep” or “Whisper” style (pitch/formant/bitcrush)
   - Confirm voice is clearly masked in A/B compare

---

## Implementation roadmap (simple version)
- M1 — Engine Core
  - Add `engineCore.ts`
  - Create a preview graph: Source → HPF → LPF → Comp → (Delay, Reverb) → Limiter → Meter
  - Create `renderOffline` that mirrors the same graph with `OfflineAudioContext`
  - Wire A/B compare to the UI
  - DoD: toggles never crash, preview feels instant, export ≈ preview

- M2 — Noise Reduction v1 (non‑AI)
  - Split into 3–4 bands with gentle expanders
  - Use Meyda RMS to drive thresholds

- M3 — Meter + Waveform
  - Peak/RMS meter, WaveSurfer preview, loop selection

- M4 — WASM options (optional)
  - `kissfft-wasm` if FFT needed; `rnnoise-wasm` toggle for denoise

- M5 — AI Enhancement v1 (optional)
  - Small windowed model, chunked, with strict fallbacks

- M6 — Mastering & Presets
  - EQ tilt, soft exciter, limiter targets; One‑Click Enhance

---

## Acceptance checks (quick)
- No crashes when toggling any effect
- Preview responsive; export sounds the same
- One‑Click Enhance improves clarity on sample clips
- Encrypt modes make identity unclear (A/B test)

---

## Ethics & privacy
- Ask for consent before recording any third‑party voice
- Show “Do not impersonate others” disclaimer
- Provide “Clear all local data” to delete samples/presets

---

## Troubleshooting (you can do this)
- If audio is silent: make sure the browser tab has audio permission and is not muted
- If export fails: try a shorter clip; ensure at least one effect or passthrough is enabled
- If UI freezes: reload the tab; try a different clip; report the step to us

---

## What we will do next (M1)
- Create `src/services/engineCore.ts`
- Wire preview graph to `VoiceEncrypter.tsx`
- Keep `audioService.ts` export working; migrate to `engineCore` step by step

That’s it. You can run the app, flip switches, and hear results. We handle the plumbing.
