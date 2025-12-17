# 🎨 Project: Icon Architect (Standalone Tool)

## 🎯 Objective
Create a completely standalone, lightweight tool for generating professional, "VS Code style" application icons (squircle, gradients, modern symbols) and exporting them in 4K resolution. This tool will NOT be part of the main Trash Hunter app but a separate utility we can use for any project.

## 🛠️ Tech Stack
- **Framework**: React + Vite (Single Page App)
- **Styling**: Tailwind CSS (for rapid UI)
- **Graphics**: SVG (for infinite scalability) + Canvas API (for PNG export)
- **Icons**: Lucide React (as base symbols)
- **Deployment**: Can be run locally or deployed to GitHub Pages as a utility site.

## ✨ Core Features

### 1. The Canvas (Preview)
- **Real-time Rendering**: See the icon update instantly as you change settings.
- **High-Res Preview**: Large 512px preview on screen.
- **Backgrounds**:
  - Transparent (for checking edges)
  - Dark/Light Mode toggle
  - Grid overlay

### 2. Customization Controls
- **Shape**:
  - Squircle (Apple/Modern Standard) - Adjustable corner radius
  - Circle (Android/Web)
  - Square (Windows Tile)
- **Colors**:
  - **Background**: Solid color or Linear/Radial Gradients.
  - **Foreground (Icon)**: Solid, Gradient, or "Glass" effect (white with opacity).
  - **Border**: Optional border width and color.
- **Symbols**:
  - Library of preset tech icons (Terminal, Code, Shield, Zap, Bug, CPU, etc.)
  - **Upload SVG**: Ability to upload your own SVG path to wrap in the style.
  - **Text/Letter**: Option to use a single letter (e.g., "W" or "TH") with custom fonts.
- **Effects**:
  - **Inner Shadow / Glow**: To give it that "3D" pop.
  - **Drop Shadow**: External shadow for the preview (not exported).
  - **Gloss/Reflection**: Top-down shine overlay.

### 3. Export Engine
- **Formats**:
  - PNG (Raster)
  - SVG (Vector - Source)
  - ICO (Windows Icon)
- **Resolutions**:
  - 1024x1024 (Master)
  - 512x512
  - 256x256
  - 64x64 (Favicon)
- **One-Click Zip**: "Download All Sizes" button.

## 📂 Project Structure (Proposed)
```
icon-architect/
├── index.html
├── package.json
├── vite.config.ts
└── src/
    ├── App.tsx            # Main Layout
    ├── components/
    │   ├── Canvas.tsx     # The SVG Renderer
    │   ├── Controls.tsx   # Sidebar with sliders/pickers
    │   └── Exporter.tsx   # Download logic
    └── utils/
        └── export.ts      # Canvas to Blob conversion logic
```

## 📅 Implementation Phases
1.  **Phase 1: Core Engine**: Setup Vite, basic SVG rendering with state (color, shape).
2.  **Phase 2: UI & Controls**: Build the sidebar with color pickers and shape selectors.
3.  **Phase 3: Export Logic**: Implement the high-res Canvas draw and download function.
4.  **Phase 4: Polish**: Add presets (VS Code Blue, JS Yellow, Rust Orange) and "Glass" effects.

## 📝 Notes
- This will be built in a separate folder `tools/icon-architect` to keep the main repo clean.
- We can use this to generate the final `icon.png` and `icon.ico` for Trash Hunter.
