# Professional Icon Creation Guide for Trash Hunter

## 1. Design Concept (Cyberpunk/Security Theme)
To match the "sexy" VS Code aesthetic, we need a flat, modern, and high-contrast icon.

**Recommended Style:**
- **Shape**: Rounded Square (like VS Code or macOS apps).
- **Colors**: 
  - Background: Deep Black/Charcoal (`#1e1e1e`)
  - Accent: Neon Green (`#0aff6a`) or Cyber Purple (`#a855f7`)
- **Symbol**: A stylized shield combined with a trash bin or a "hunter" crosshair.

## 2. How to Create It (No Design Skills Needed)

### Option A: AI Generation (Fastest)
1. Go to **Midjourney** or **DALL-E 3**.
2. Prompt: *"App icon for a cyberpunk system cleaner tool, minimalist, flat vector style, neon green and black, rounded square shape, high quality, white background"*
3. Remove background using a tool like `remove.bg`.

### Option B: Figma (Professional)
1. Create a 512x512 frame.
2. Add a rounded rectangle (Corner radius: 100).
3. Fill with dark gradient.
4. Place a white/neon icon in the center (use Lucide icons or FontAwesome).

## 3. Generating the Files
Once you have your `icon.png` (must be 1024x1024 for best results):

1. **Online Converter**: Go to [tauri.app/v1/guides/building/icons](https://tauri.app/v1/guides/building/icons) or use [icon.kitchen](https://icon.kitchen).
2. **Tauri Command** (If you have the source image):
   Save your image as `app-icon.png` in the root folder.
   Run:
   ```powershell
   npm run tauri icon app-icon.png
   ```
   *This automatically generates all the sizes (ico, icns, png) and puts them in `src-tauri/icons`.*

## 4. Replacing the "Bad" Icon
1. Delete everything in `d:\A scret project\Word hacker 404\trash-hunter\src-tauri\icons`.
2. Paste your new generated icons there.
3. Rebuild the app (`npm run tauri build`).

## 5. VS Code Style Tips
- **Contrast**: Ensure the logo pops against a dark taskbar.
- **Simplicity**: Don't use text. Use a strong symbol.
- **Padding**: Leave 15-20% padding around the inner logo so it doesn't touch the edges.
