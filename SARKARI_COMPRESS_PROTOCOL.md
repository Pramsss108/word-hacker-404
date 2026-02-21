# SARKARI.COMPRESS | Project Protocol

## Overview
**Sarkari Compress** is a high-performance, client-side document optimization engine designed for the Word Hacker 404 ecosystem. It specializes in ultra-fast compression of images and PDFs without server interaction, ensuring 100% privacy for sensitive government (Sarkari) documents.

## Core Architecture
- **Language**: TypeScript / React
- **Logic**: 100% Local (Runs in the browser)
- **Engine**: 
  - Image: HTML5 Canvas + Web Workers
  - PDF: Integrated PDF-LIB arbitration
- **Deployment**: Firebase Hosting (Primary) / GitHub Pages (Fallback)

## Deployment Protocol
To keep the live site updated, use the following dual-sync procedure:

### 1. Save Code (Dev Logic)
```bash
git add .
git commit -m "feat: Updates to Sarkari engine"
git push origin main
```
*This saves your work to GitHub but does **NOT** update the live website.*

### 2. Launch Live (Production)
```bash
npm run build
firebase deploy
```
*This builds the production package and pushes it to the custom domain `wordhacker404.me`.*

## Security Standards
- **Zero-Storage**: No files are uploaded to any server. Everything happens in RAM.
- **Metadata Stripping**: All EXIF data is scrubbed during compression.
- **Path Isolation**: Dedicated standalone route at `/freesarkarifilecompress`.

---
*Maintained by the Word Hacker 404 Agentic Suite.*
