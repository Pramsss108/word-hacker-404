# 🧬 Vector Sovereign: The "Revolution" Enhancement Plan

## 1. 🕵️‍♂️ Competitor Intelligence & Engine Analysis

### "Are all engines the same?"
**No.** Most free tools use the same old algorithms, which is why they suck compared to Vector Magic.

*   **Vector Magic (The King):** Uses a proprietary, closed-source algorithm developed at Stanford. It uses "psychometric" tracing—guessing what the shape *should* be rather than just following pixels.
*   **Adobe Illustrator (Image Trace):** Proprietary. Very good at smoothing.
*   **The "Free" Standard:** Most open-source tools use **Potrace** (Black & White only) or **ImageTracer** (Color).

### 🧪 Our Multi-Engine Strategy
To beat the "free" market, we cannot rely on just one engine. We will build a **Hybrid Engine Switcher**:

| Engine | Best For | Tech Stack | Status |
| :--- | :--- | :--- | :--- |
| **ImageTracerJS** | **Logos, Illustrations, Color** | JavaScript | ✅ Implemented |
| **Potrace (WASM)** | **CNC, Laser Cutting, B&W Signage** | C++ compiled to WASM | 🚧 To Add |
| **VTracer** | **Photos, Scans** | Rust compiled to WASM | 🚧 To Add |

**The Strategy:**
When a user selects a "Niche" (e.g., CNC), we silently switch the engine to **Potrace** because it produces cleaner, mathematically perfect lines for machines. When they select "Logo", we use **ImageTracer** or **VTracer** for color handling.

---

## 2. 🧠 The "AI Pre-Processing" Pipeline (The Secret Sauce)

Vector Magic wins because it cleans the image *before* tracing. We will replicate this using **Client-Side AI Libraries** (Free, No Server).

### Step A: 🚫 Intelligent Background Removal
*   **Problem:** Tracing a logo with a white box around it creates a useless white vector square.
*   **Solution:** Remove the background *before* vectorization.
*   **Library:** `@imgly/background-removal`
    *   **Cost:** Free / Open Source.
    *   **Tech:** WASM + ONNX (Runs 100% in browser).
    *   **Size:** ~10MB download (cached).

### Step B: 🔍 AI Upscaling (Super Resolution)
*   **Problem:** Tiny, pixelated images produce jagged vectors ("staircase effect").
*   **Solution:** Upscale the image 2x or 4x using AI to smooth out edges *before* the tracer sees it.
*   **Library:** `upscalerjs` (TensorFlow.js)
    *   **Cost:** Free / Open Source.
    *   **Tech:** Deep Learning models in browser.
    *   **Result:** A 100px icon becomes a 400px smooth image, resulting in 10x better vectors.

---

## 3. 🛠️ UI/UX Enhancements: The "Pro" Workspace

### Dedicated Preview Panel
We will evolve the current "Command Center" into a professional workspace:
1.  **"The Lightbox"**: A dedicated modal for inspecting results without UI clutter.
2.  **View Modes**:
    *   **Split Slider:** (Current) Best for alignment check.
    *   **Side-by-Side:** Best for color comparison.
    *   **Onion Skin:** Overlay vector on original with 50% opacity.
    *   **Wireframe:** Show only the vector paths (nodes) - Critical for CNC users.

---

## 4. 🚀 Implementation Roadmap (The Revolution)

### Phase 4.1: The "Cleaner" (Background Removal)
- [ ] Install `@imgly/background-removal`.
- [ ] Add "Remove Background" toggle in the Architect panel.
- [ ] Process: Upload -> Remove BG -> Vectorize.

### Phase 4.2: The "Enhancer" (Upscaling)
- [ ] Install `upscalerjs` and `@tensorflow/tfjs`.
- [ ] Add "AI Upscale" button (Warning: Slow on mobile).
- [ ] Process: Upload -> Upscale (2x) -> Vectorize.

### Phase 4.3: The "Engineer" (Potrace Integration)
- [ ] Compile `potrace` to WASM or find a wrapper.
- [ ] Link "CNC/Laser" preset to Potrace engine.
- [ ] Add "Centerline Tracing" (Holy grail for CNC).

### Phase 4.4: The "Inspector" (Advanced Preview)
- [ ] Add "Wireframe Mode" to SVG renderer.
- [ ] Add "Side-by-Side" view toggle.
