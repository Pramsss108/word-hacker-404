#!/usr/bin/env pwsh
# Automated Desktop App Release Script
# Usage: .\release-desktop.ps1 -Version "1.0.1"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Desktop App Release Process..." -ForegroundColor Cyan
Write-Host "Version: $Version" -ForegroundColor Yellow

# Step 1: Build the app
Write-Host "`n📦 Building desktop app..." -ForegroundColor Green
npm run package:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Find the installer
$installerPath = Get-ChildItem -Path "release" -Filter "*.exe" | Select-Object -First 1
if (-not $installerPath) {
    Write-Host "❌ Installer not found in release/ directory!" -ForegroundColor Red
    exit 1
}

$installerName = $installerPath.Name
$installerFullPath = $installerPath.FullName
Write-Host "✅ Found installer: $installerName" -ForegroundColor Green

# Step 3: Get file size
$fileSize = [math]::Round($installerPath.Length / 1MB, 2)
Write-Host "📊 Size: $fileSize MB" -ForegroundColor Cyan

# Step 4: Create git tag
$tagName = "desktop-v$Version"
Write-Host "`n🏷️  Creating git tag: $tagName" -ForegroundColor Green

git tag -a $tagName -m "Desktop App Release v$Version

📦 Package: $installerName
💾 Size: $fileSize MB
🪟 Platform: Windows x64
✨ Features: YT Downloader with FFmpeg + yt-dlp bundled"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git tag creation failed!" -ForegroundColor Red
    exit 1
}

# Step 5: Push tag to GitHub
Write-Host "`n⬆️  Pushing tag to GitHub..." -ForegroundColor Green
git push origin $tagName
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git push failed!" -ForegroundColor Red
    exit 1
}

# Step 6: Create GitHub release with file
Write-Host "`n📤 Creating GitHub release and uploading installer..." -ForegroundColor Green
Write-Host "⚠️  MANUAL STEP REQUIRED:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://github.com/Pramsss108/word-hacker-404/releases/new" -ForegroundColor White
Write-Host "2. Select tag: $tagName" -ForegroundColor White
Write-Host "3. Title: 'WH404 Desktop Downloader v$Version'" -ForegroundColor White
Write-Host "4. Description:" -ForegroundColor White
Write-Host @"

## 📦 WH404 Desktop Downloader v$Version

Windows desktop app for downloading YouTube videos and audio.

### ✨ Features
- Download videos in multiple resolutions (1080p, 720p, etc.)
- Extract audio in various formats (MP3, M4A, etc.)
- Trim/crop videos before export
- FFmpeg + yt-dlp bundled (no external dependencies)
- Clean, hacker-style UI

### 🪟 Installation
1. Download ``$installerName`` below
2. Run the installer
3. Launch WH404 Desktop Downloader
4. Paste YouTube URLs and download!

### 📊 File Info
- **Size:** $fileSize MB
- **Platform:** Windows x64
- **Auto-updates:** Enabled (checks GitHub for new versions)

### 📧 Support
Contact: team@bongbari.com
"@ -ForegroundColor Gray

Write-Host ""
Write-Host "5. Drag and drop this file into 'Attach binaries':" -ForegroundColor White
Write-Host "   $installerFullPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "6. Click 'Publish release'" -ForegroundColor White
Write-Host ""

# Step 7: Generate download URL for website
$encodedName = [System.Uri]::EscapeDataString($installerName)
$downloadUrl = "https://github.com/Pramsss108/word-hacker-404/releases/download/$tagName/$encodedName"

Write-Host "`n✅ RELEASE PROCESS SUMMARY" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host "Tag created: $tagName" -ForegroundColor Cyan
Write-Host "Installer: $installerName ($fileSize MB)" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 Download URL (for website):" -ForegroundColor Yellow
Write-Host $downloadUrl -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT: After creating the GitHub release, update these files:" -ForegroundColor Yellow
Write-Host "   - src/App.tsx" -ForegroundColor White
Write-Host "   - src/components/ToolsPage.tsx" -ForegroundColor White
Write-Host ""
Write-Host "Replace download URL with:" -ForegroundColor Yellow
Write-Host $downloadUrl -ForegroundColor White
Write-Host ""
Write-Host "Then run: npm run build && git add -A && git commit -m 'chore: update desktop download URL' && git push" -ForegroundColor Cyan
