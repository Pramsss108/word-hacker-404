# Video Preview & Processing Fix Guide

## Problem Summary
Video preview failed to load files with complex filenames containing spaces, parentheses, and special Unicode characters (fullwidth pipes `｜`).

## Root Causes Identified

### 1. Filename Mismatch
- **Queue stores**: Path from YouTube metadata with double spaces and regular pipes
- **Actual file**: yt-dlp saves with normalized single spaces and fullwidth Unicode pipes `｜`
- **Example**:
  - Expected: `Pal Pal X Talwiinder  - Nonstop Mashup  Talha Anjum  Afusic.mp4`
  - Actual: `Pal Pal X Talwiinder  - Nonstop Mashup ｜ Talha Anjum ｜ Afusic.mp4`

### 2. Tauri Asset Protocol Issues
- **Problem**: `convertFileSrc()` encodes backslashes as `%5C` causing `ERR_CONNECTION_REFUSED`
- **Solution**: Normalize Windows backslashes to forward slashes BEFORE conversion

### 3. Memory Allocation Error
- **Problem**: Blob loading (reading entire file to memory) crashes with large videos (75GB allocation attempt)
- **Solution**: Skip blob loading, use Tauri asset protocol directly

### 4. Extension Stripping Bug
- **Problem**: Regex `/\.[^.]+$/` only removed last extension, leaving format codes (e.g., `.f140.m4a` → removed `.m4a` but kept `.f140`)
- **Solution**: Include full filename with all extensions in fuzzy matching

## Final Working Solution

### File: `src/renderer/bridge.js`
```javascript
convertPath: (filePath) => {
  if (isTauri) {
    try {
      // CRITICAL: Normalize backslashes to forward slashes BEFORE conversion
      const normalized = filePath.replace(/\\/g, '/');
      
      const { convertFileSrc } = window.__TAURI__.tauri;
      const url = convertFileSrc(normalized);
      return url;
    } catch (e) {
      console.error('[Bridge] convertPath failed:', e);
      return null;
    }
  }
  return null;
}
```

### File: `src/index.js` - Smart File Matching
```javascript
// Normalize path (remove double spaces)
let normalizedSource = source.replace(/  +/g, ' ');

// If file doesn't exist, search directory with fuzzy matching
const normalizeForMatch = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
// This includes extension → "apekkhaprithibireincarnationversionf140m4a"

const match = files.find(f => {
  const fileNormalized = normalizeForMatch(f);
  return fileNormalized === expectedNormalized;
});
```

// If file doesn't exist, search directory with fuzzy matching
const dirPath = source.substring(0, source.lastIndexOf('\\'));
const expectedFilename = source.substring(source.lastIndexOf('\\') + 1);

const files = await window.downloader.readDir(dirPath);

// Match by removing ALL non-alphanumeric characters (handles Unicode pipes, spaces, etc.)
const normalizeForMatch = (str) => str.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const expectedNormalized = normalizeForMatch(expectedFilename);

const match = files.find(f => {
  const fileNormalized = normalizeForMatch(f);
  return fileNormalized === expectedNormalized;
});

if (match) {
  normalizedSource = `${dirPath}\\${match}`;
}
```

### File: `src-tauri/tauri.conf.json`
```json
"fs": {
  "all": true,
  "scope": ["$DOWNLOAD/**", "$TEMP/*", "$APP/*"]
}
```
**Note**: Use `$DOWNLOAD/**` (double asterisk) for recursive access to subdirectories.

## What NOT to Do (Lessons Learned)

### ❌ Don't: Load large files into memory
```javascript
// BAD - Causes 75GB memory allocation crash
const data = await readBinaryFile(filePath);
const blob = new Blob([data], { type: mime });
```
**Why**: Large video files will exhaust memory instantly.

### ❌ Don't: Use Windows backslashes in Tauri asset URLs
```javascript
// BAD - Causes ERR_CONNECTION_REFUSED
convertFileSrc('C:\\Users\\...\\file.mp4')
```
**Why**: Asset protocol rejects encoded backslashes (`%5C`).

### ❌ Don't: Rely on exact filename matching
```javascript
// BAD - Fails with Unicode chars or spaces
if (filename === expectedFilename)
```
**Why**: yt-dlp normalizes filenames differently than YouTube metadata.

### ❌ Don't: Edit `renderer.js` when using bundled `index.js`
**Why**: The app uses `src/index.js` directly, not `src/renderer/renderer.js`. Always check which file is actually loaded.

## Debugging Checklist

1. **Check actual filename**:
   ```javascript
   const files = await window.downloader.readDir(dirPath);
   console.log('Files:', files);
   ```

2. **Verify path normalization**:
   ```javascript
   console.log('Original:', filePath);
   console.log('Normalized:', filePath.replace(/\\/g, '/'));
   ```

3. **Test asset URL**:
   ```javascript
   const url = convertFileSrc(normalizedPath);
   console.log('Asset URL:', url);
   // Should be: https://asset.localhost/C:/Users/.../file.mp4
   ```

4. **Check Tauri permissions**:
   - Ensure `$DOWNLOAD/**` in `fs.scope`
   - Check console for "path not allowed" errors

## Success Indicators

✅ Console shows:
```
[Preview] Found matching file: Pal Pal X Talwiinder  - Nonstop Mashup ｜ Talha Anjum...mp4
[Bridge] Converted to asset URL: https://asset.localhost/C:/Users/.../file.mp4
```

✅ Video plays without errors

✅ No memory allocation crashes

## Related Files
- `src/index.js` - Main preview logic (line 1035-1100: `loadPreviewFromItem`)
- `src/renderer/bridge.js` - Path conversion (line 85-100: `convertPath`)
- `src-tauri/tauri.conf.json` - Filesystem permissions (`fs.scope`)

## Complete Bug Journey (For Future Agents)

### Iteration 1: Wrong File
- **Error**: Modified `src/renderer/renderer.js` but changes didn't apply
- **Cause**: App uses bundled `src/index.js`, not modular renderer
- **Fix**: Always check `index.html` to see which JS file is loaded

### Iteration 2: Vite Cache
- **Error**: Code changes not reflecting in browser
- **Cause**: Vite HMR serving cached `index.js`
- **Fix**: Full app restart (kill port 3000 + `npm run tauri:dev`)

### Iteration 3: Blob Loading
- **Error**: App crashed with 75GB memory allocation
- **Cause**: Attempted to load entire video file into memory as Blob
- **Fix**: Removed blob loading, use Tauri asset protocol directly

### Iteration 4: Filename Unicode Mismatch
- **Error**: File exists check returned `false` for existing files
- **Cause**: Queue stored `｜` (regular pipe), file had `｜` (fullwidth Unicode)
- **Fix**: Implemented fuzzy matching stripping all non-alphanumeric chars

### Iteration 5: Extension Stripping Bug
- **Error**: Fuzzy match failed for `.f140.m4a` files
- **Cause**: Regex `/\.[^.]+$/` only removed `.m4a`, left `.f140` in filename
- **Fix**: Changed normalizer to keep full filename: `str.toLowerCase().replace(/[^a-z0-9]/g, '')`

### Iteration 6: Backslash Encoding
- **Error**: Asset URLs returned `ERR_CONNECTION_REFUSED`
- **Cause**: `convertFileSrc()` encoded `\` as `%5C`, Tauri rejected it
- **Fix**: Normalize to forward slashes BEFORE calling `convertFileSrc()`

## Audio Quality Fix (December 8, 2025)

### Problem
Only 128kbps showing in audio dropdown, missing higher quality options.

### Root Cause
`extractAudioFormatsFromFormats()` used `Map` with bitrate as key, causing duplicate bitrates to overwrite each other.

### Solution
```javascript
// OLD - Only unique bitrates
const qualities = new Map();
audioFormats.forEach(fmt => {
  const key = Math.floor(fmt.abr || 128);
  if (!qualities.has(key) || ...) { qualities.set(key, ...) }
});

// NEW - All formats sorted highest to lowest
const formattedAudio = audioFormats.map(fmt => ({
  id: fmt.id,
  label: `${Math.floor(fmt.abr || 128)}kbps - ${acodec} (${ext})`,
  ...
}));
return formattedAudio.sort((a, b) => (b.abr || 0) - (a.abr || 0));
```

## Thumbnail Download Fix (December 8, 2025)

### Changes
- **Export panel**: Changed "Copy link" → "Download" button
- **Handler**: `data-export-download="thumbnail"` triggers `triggerDownloadFromUrl()`
- **Location**: Downloads to browser's default download folder (will add custom location picker)

### Files Modified
- `src/renderer/index.html` - Button HTML (line 391)
- `src/index.js` - Event handler (line 2196-2203)
- `src-tauri/tauri.conf.json` - Filesystem permissions

## Date Fixed
December 8, 2025

## Agent Notes
This issue took multiple iterations to solve because:
1. We initially edited the wrong file (`renderer.js` vs `index.js`)
2. Blob loading seemed like a good idea but failed with large files
3. Filename mismatches were subtle (Unicode fullwidth pipes vs regular pipes)
4. Tauri's asset protocol has specific requirements for path format

**Key takeaway**: Always verify which file is actually running, test with realistic file sizes, and use fuzzy filename matching for downloaded content.
