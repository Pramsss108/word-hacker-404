# RAW Decode Zero-to-Hero Plan (Mission 404)

Our USP: **decode every mainstream RAW format into any publish-ready format with zero color loss, zero mocks, and zero second tries.** This roadmap is structured so each phase must hit “first-attempt success” gates before unlocking the next.

---

## 1. Mission Lock
- **Lossless by default**: 16-bit internal pipeline, no tone hacks unless user opts in.
- **Format breadth**: Canon CR2/CR3, Nikon NEF, Sony ARW, Fuji RAF, DNG, Hasselblad 3FR/Flex — minimum 95% coverage of sample vault.
- **Deterministic exports**: TIFF (16-bit), PNG (16-bit), JPEG XL, and downscaled JPG preview — all byte-identical between runs.
- **Single-command onboarding**: contributors run `npm install && npm run dev` with zero manual WASM builds.
- **Observability**: every stage emits color variance + histogram data so QA can prove we never ship grayscale regressions again.

## 2. Quality Gates (apply to *every* phase)
1. **Color validator ≥ 98%** on canonical test suite (LibRaw Golden, Adobe DNG Sample Pack, our IMG_5034).  
2. **Bit-depth audit**: exported files must pass `exiftool` + `identify -verbose` checks (16-bit channels remain 16-bit).  
3. **Latency budget**: first preview ≤ 2.5 s on M1 and ≤ 5 s on Pixel 8; full export ≤ 12 s on M1.  
4. **Crash-free sessions**: 20-run stress test with alternating files must produce 0 uncaught errors in console.  
5. **No mocks**: code paths logging “mock” or “synthetic” buffers automatically fail CI.

## 3. Technology Stack (2025 options)
| Layer | Preferred Tech | Rationale |
| --- | --- | --- |
| RAW parsing | **wasm-vips** prebuilt bundle + `libraw-wasm` nightly | Battle-tested C++ color science, ships as npm wasm binary with Emscripten FS already wired. |
| Worker infra | `@temporalio/webworker`-style pool or light `comlink` wrapper | Deterministic job queue, retry on transient decode failures. |
| Tone/Color | `colour-science` LUTs + ACES transforms (JS) | Maintains cinema-grade tone control; LUT files live in repo. |
| Exporters | `wasm-vips` pipelines + `libjxl-wasm` for JPEG XL | Guarantees 16-bit TIFF/PNG + modern delivery format. |
| QA harness | Playwright + headless WebGPU capture of histograms | Automates “first attempt” gate before merge. |

---

## 4. Phased Execution Checklist (0 ➜ Hero)
Tick every box in order. A phase closes only when **all** checkboxes are ✅.

### Phase 0 — Environment Seal
- [x] Publish precompiled `wasm-vips` + `libraw-wasm` bundles to `public/wasm/` (signed hashes).
- [x] Replace PowerShell scripts with npm tasks (`raw:bootstrap`, `raw:doctor`) that only download verified artifacts.
- [x] Add CI step that diff-checks wasm hashes so rogue builds can’t sneak in.

### Phase 1 — Deterministic Ingest
- [x] Implement `RawSession` class (TypeScript) that validates file headers, mime, and deduces color filter array before decode.
- [x] Wire worker pool (`raw-worker.ts`) using Comlink; every job carries a “first-run” UUID for tracing.
- [x] Add watchdog for SharedArrayBuffer availability and fall back to single worker with explicit warning.

### Phase 2 — Lossless Pipeline Core
> **Status — 2025-11-21:** Phase 2 locked. LibRaw ingest now hands 16-bit buffers directly into wasm-vips for verification, UTIF previews feed an arbitration watchdog, color matrices + black level lifts are applied inline, and diagnostics stream QA histograms with variance scores.
- [x] Integrate `wasm-vips` demosaic path with 16-bit RGGB buffer handoff (no 8-bit intermediates).
- [x] Layer LibRaw color matrices + black level corrections; expose histograms for QA overlay.
- [x] Implement multi-engine arbitration (LibRaw ➜ wasm-vips ➜ UTIF JPEG) with rejection logic if variance < 30%.

### Phase 3 — Format Output Matrix
> **Status — 2025-11-21:** Export matrix online. Lossless TIFF/PNG/JPEG XL builds flow directly from the 16-bit pipeline, EXIF + sRGB metadata now travel with every artifact, and the diagnostics panel exposes both the preview slider and a persistent export log for QA replay.
- [x] Build exporter service for TIFF 16-bit, PNG 16-bit, JPEG XL, and downscaled JPEG preview (quality slider but constant bit depth internally).
- [x] Embed EXIF + color profiles using a deterministic in-house EXIF builder + PNG sRGB metadata; verify orientation, camera tags, and unique UUID.
- [x] Add per-export checksum + size reporting to Diagnostics HUD.

### Phase 4 — QA Gauntlet
- [ ] Recreate the color validator CLI (`npm run raw:color-test`) that runs golden set + asserts variance thresholds.
- [ ] Create automated “20-run torture” Playwright test that uploads 20 RAW files sequentially and checks console/network noise.
- [ ] Implement regression dashboard (per file ➜ color score, time-to-preview, memory usage) stored in `diagnostics-intake/`.

### Phase 5 — UX Integration (ToolsPage re-entry)
- [ ] Restore `RawImageConverter` UI with updated hooks (device capability banner, engine selection, export queue).
- [ ] Provide instant preview (UTIF/embedded) while lossless pipeline runs, but label it “Diagnostic Preview” until HQ buffer arrives.
- [ ] Ensure export buttons stay disabled until 16-bit buffers + metadata pass QA gates.

### Phase 6 — Launch & Guardrails
- [ ] Ship “Mission 404” release notes documenting supported cameras + test evidence.
- [ ] Add telemetry toggle (opt-in) that anonymously reports phase durations + engine choices.
- [ ] Codify maintenance SOP (when new camera arrives ➜ drop sample ➜ rerun golden suite ➜ update support table).

---

## 5. Governance
- Any code touching RAW decode/export must reference this plan in PR description (`#RAW-ZERO-TO-HERO Phase X`).
- “Mock”, “synthetic”, or “fallback JPEG export” strings are forbidden in `main`. CI should fail if they appear.
- QA holds veto power: if color score dips, revert before adding new features.

> When every checkbox is ticked, we re-earn the “first-in-class lossless RAW converter” badge without ever lying to users or shipping grayscale surprises.
