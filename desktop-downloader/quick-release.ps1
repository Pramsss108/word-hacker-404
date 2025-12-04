#!/usr/bin/env pwsh
# Quick Release Script with Full Automation
# Usage: .\quick-release.ps1 -Version "1.0.1"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n$Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Check if GitHub CLI is installed
Write-Step "Checking GitHub CLI..."
$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghInstalled) {
    Write-Host "GitHub CLI not found. Installing..." -ForegroundColor Yellow
    try {
        winget install GitHub.cli
        Write-Success "GitHub CLI installed"
        Write-Host "⚠️  Please run 'gh auth login' to authenticate, then run this script again" -ForegroundColor Yellow
        exit 0
    } catch {
        Write-Error "Failed to install GitHub CLI. Please install manually from https://cli.github.com/"
        exit 1
    }
}

# Check authentication
Write-Step "Verifying GitHub authentication..."
try {
    gh auth status | Out-Null
    Write-Success "Authenticated"
} catch {
    Write-Error "Not authenticated. Please run: gh auth login"
    exit 1
}

# Build the app
Write-Step "🔨 Building desktop app..."
npm run package:win
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed!"
    exit 1
}
Write-Success "Build completed"

# Find installer
Write-Step "🔍 Finding installer..."
$installer = Get-ChildItem -Path "release" -Filter "*.exe" -File | Select-Object -First 1
if (-not $installer) {
    Write-Error "No .exe file found in release/ directory"
    exit 1
}

$installerPath = $installer.FullName
$installerName = $installer.Name
$fileSize = [math]::Round($installer.Length / 1MB, 2)
Write-Success "Found: $installerName ($fileSize MB)"

# Create git tag
$tagName = "desktop-v$Version"
Write-Step "🏷️  Creating git tag: $tagName"

# Delete existing tag if it exists
git tag -d $tagName 2>$null
git push origin --delete $tagName 2>$null

git tag -a $tagName -m "Desktop App v$Version - $installerName ($fileSize MB)"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create tag"
    exit 1
}

git push origin $tagName
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to push tag"
    exit 1
}
Write-Success "Tag pushed to GitHub"

# Create GitHub release
Write-Step "📦 Creating GitHub release..."
$releaseNotes = @"
## 📦 WH404 Desktop Downloader v$Version

Windows desktop app for downloading YouTube videos and audio offline.

### ✨ Features
- Download videos in multiple resolutions (1080p, 720p, 480p, etc.)
- Extract audio in various formats (MP3, M4A, OGG, WAV)
- Trim/crop videos with magnetic timeline
- Format conversion (MP4, MKV, AVI, WEBM)
- FFmpeg + yt-dlp bundled (no external dependencies)
- Auto-update checker
- Clean hacker-style UI

### 🪟 Installation
1. Download **$installerName** below
2. Run the installer (Windows may show SmartScreen - click "More info" → "Run anyway")
3. Launch **WH404 - YT Downloader**
4. Paste YouTube URLs and download!

### 📊 File Info
- **Size:** $fileSize MB
- **Platform:** Windows 10/11 (64-bit)
- **Auto-updates:** Enabled (Help → Check for updates)

### 📧 Support
Email: team@bongbari.com
"@

try {
    # Delete existing release if it exists
    gh release delete $tagName --yes 2>$null
    
    # Create new release with file
    gh release create $tagName `
        $installerPath `
        --title "WH404 Desktop Downloader v$Version" `
        --notes $releaseNotes `
        --repo Pramsss108/word-hacker-404
    
    Write-Success "Release created and installer uploaded"
} catch {
    Write-Error "Failed to create GitHub release: $_"
    exit 1
}

# Generate download URL
$encodedName = [System.Uri]::EscapeDataString($installerName)
$downloadUrl = "https://github.com/Pramsss108/word-hacker-404/releases/download/$tagName/$encodedName"

Write-Step "🔗 Updating website download URLs..."

# Update App.tsx
$appFile = "..\src\App.tsx"
if (Test-Path $appFile) {
    $appContent = Get-Content $appFile -Raw
    $appContent = $appContent -replace "https://github\.com/Pramsss108/word-hacker-404/releases/download/desktop-v[\d\.]+/[^'""]+", $downloadUrl
    Set-Content $appFile -Value $appContent -NoNewline
    Write-Success "Updated App.tsx"
}

# Update ToolsPage.tsx
$toolsFile = "..\src\components\ToolsPage.tsx"
if (Test-Path $toolsFile) {
    $toolsContent = Get-Content $toolsFile -Raw
    $toolsContent = $toolsContent -replace "https://github\.com/Pramsss108/word-hacker-404/releases/download/desktop-v[\d\.]+/[^'""]+", $downloadUrl
    Set-Content $toolsFile -Value $toolsContent -NoNewline
    Write-Success "Updated ToolsPage.tsx"
}

# Commit and push website changes
Write-Step "📤 Deploying website updates..."
cd ..
git add src/App.tsx src/components/ToolsPage.tsx
git commit -m "chore: update desktop download URL to v$Version

- Auto-generated download URL: $downloadUrl
- Installer: $installerName ($fileSize MB)
- Release tag: $tagName"

git push origin main
Write-Success "Website deployed"

# Summary
Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════" -ForegroundColor Green
Write-Host "🎉 RELEASE COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Version:      " -NoNewline; Write-Host "v$Version" -ForegroundColor Cyan
Write-Host "Tag:          " -NoNewline; Write-Host $tagName -ForegroundColor Cyan
Write-Host "Installer:    " -NoNewline; Write-Host $installerName -ForegroundColor Cyan
Write-Host "Size:         " -NoNewline; Write-Host "$fileSize MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 Release:   " -NoNewline; Write-Host "https://github.com/Pramsss108/word-hacker-404/releases/tag/$tagName" -ForegroundColor Yellow
Write-Host "🔗 Download:  " -NoNewline; Write-Host $downloadUrl -ForegroundColor Yellow
Write-Host "🌐 Website:   " -NoNewline; Write-Host "https://wordhacker404.me (updating...)" -ForegroundColor Yellow
Write-Host ""
Write-Host "✨ Users can now download v$Version from your website!" -ForegroundColor Green
Write-Host ""
