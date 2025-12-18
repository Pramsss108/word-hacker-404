#!/usr/bin/env pwsh
# One-Click Release Automation with Auto-Update Links
# Usage: .\one-click-release.ps1

param(
    [string]$Version = "1.0.0"
)

# Ensure we are running in the script's directory
Set-Location $PSScriptRoot

$ErrorActionPreference = "Stop"
$releaseRepo = "Pramsss108/wh404-desktop-builds"
$websiteRepo = "Pramsss108/word-hacker-404"

function Write-Step {
    param([string]$Message)
    Write-Host "`n✨ $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Check GitHub CLI
Write-Step "Checking GitHub CLI..."
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI not found. Install: winget install GitHub.cli"
    exit 1
}
Write-Success "GitHub CLI ready"

# Check authentication
Write-Step "Verifying authentication..."
try {
    gh auth status 2>&1 | Out-Null
    Write-Success "Authenticated"
} catch {
    Write-Error "Not authenticated. Run: gh auth login"
    exit 1
}

# Build the app
Write-Step "Building desktop app..."
npm run tauri:build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed!"
    exit 1
}
Write-Success "Build completed"

# Find installer
Write-Step "Locating installer..."
$installer = Get-ChildItem -Path "src-tauri\target\release\bundle\nsis" -Filter "*$Version*.exe" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $installer) {
    Write-Error "No installer found matching version $Version"
    exit 1
}

$installerPath = $installer.FullName
$installerName = $installer.Name
$fileSize = [math]::Round($installer.Length / 1MB, 2)
Write-Success "Found: $installerName ($fileSize MB)"

# Create git tag
$tagName = "desktop-v$Version"
Write-Step "Creating git tag: $tagName"

# Delete existing tag if exists (allow failure)
try { git tag -d $tagName 2>&1 | Out-Null } catch {}
try { git push origin --delete $tagName 2>&1 | Out-Null } catch {}

git tag -a $tagName -m "Desktop App v$Version"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create tag"
    exit 1
}

git push origin $tagName
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to push tag"
    exit 1
}
Write-Success "Tag pushed"

# Create GitHub release
Write-Step "Creating GitHub release..."

$releaseNotes = @"
## 🎉 WH404 Desktop Downloader v$Version

### Professional Desktop App
- ✅ Native Windows UI (professional appearance)
- ✅ Starts maximized for best experience
- ✅ 52/52 features complete (100%)

### Features
- Multi-platform downloads (YouTube, Instagram, TikTok, Facebook, Reddit, etc.)
- Batch download with queue management
- Video preview & precision trim tool
- All audio qualities (auto-detected from source)
- Thumbnail download with native dialogs
- Export system (MP4, MP3, WEBM, M4A)
- Metadata editor (title, description, tags)
- Download history tracking

### Requirements
- Windows 10 (1903+) or Windows 11
- x64 processor (Intel/AMD 64-bit)
- $fileSize MB download

### Installation
Download and run. No admin rights required.

---
**Full Changelog**: https://github.com/$websiteRepo/commits/$tagName
"@

# Delete existing release if exists
gh release delete $tagName --repo $releaseRepo --yes 2>$null

# Create new release
gh release create $tagName `
    $installerPath `
    --repo $releaseRepo `
    --title "WH404 Desktop Downloader v$Version" `
    --notes $releaseNotes `
    --latest

Write-Success "Release created: https://github.com/$releaseRepo/releases/tag/$tagName"

# Get the actual download URL from GitHub API
Write-Step "Fetching download URL from GitHub..."
Start-Sleep -Seconds 2  # Wait for GitHub to process

$releaseData = gh api "repos/$releaseRepo/releases/tags/$tagName" | ConvertFrom-Json
$asset = $releaseData.assets | Where-Object { $_.name -like "*.exe" } | Select-Object -First 1

if (-not $asset) {
    Write-Error "Could not find .exe asset in release"
    exit 1
}

$downloadUrl = $asset.browser_download_url
Write-Success "Download URL: $downloadUrl"

# Update website files
Write-Step "Updating website download links..."

# Navigate to root
cd ..

# Update ToolsPage.tsx
$toolsFile = "src\components\ToolsPage.tsx"
if (Test-Path $toolsFile) {
    $content = Get-Content $toolsFile -Raw
    
    # Replace the download URL using regex
    $pattern = 'https://github\.com/Pramsss108/wh404-desktop-builds/releases/download/desktop-v[\d\.]+/[^\)''"\s]+'
    $content = $content -replace $pattern, $downloadUrl
    
    Set-Content $toolsFile -Value $content -NoNewline
    Write-Success "Updated $toolsFile"
}

# Update App.tsx if it has download links
$appFile = "src\App.tsx"
if (Test-Path $appFile) {
    $appContent = Get-Content $appFile -Raw
    if ($appContent -match 'wh404-desktop-builds') {
        $appContent = $appContent -replace $pattern, $downloadUrl
        Set-Content $appFile -Value $appContent -NoNewline
        Write-Success "Updated $appFile"
    }
}

# Commit and push website changes
Write-Step "Deploying website updates..."
git add .
$commitMsg = @"
chore: auto-update desktop download URL to v$Version

Release: https://github.com/$releaseRepo/releases/tag/$tagName
Installer: $installerName ($fileSize MB)
Download: $downloadUrl

Auto-generated by one-click-release.ps1
"@

git commit -m $commitMsg
git push origin main
Write-Success "Website deployed"

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "🎉 RELEASE COMPLETE - FULLY AUTOMATED!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Version:          " -NoNewline; Write-Host "v$Version" -ForegroundColor Cyan
Write-Host "Tag:              " -NoNewline; Write-Host $tagName -ForegroundColor Cyan
Write-Host "Installer:        " -NoNewline; Write-Host $installerName -ForegroundColor Cyan
Write-Host "Size:             " -NoNewline; Write-Host "$fileSize MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Release Page:     " -NoNewline; Write-Host "https://github.com/$releaseRepo/releases/tag/$tagName" -ForegroundColor Yellow
Write-Host "Download Link:    " -NoNewline; Write-Host $downloadUrl -ForegroundColor Yellow
Write-Host "Website:          " -NoNewline; Write-Host "https://wordhacker404.me (deploying...)" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Website automatically updated with latest download link" -ForegroundColor Green
Write-Host "✅ GitHub Actions deploying to production" -ForegroundColor Green
Write-Host "✅ Users will see new version in 2-3 minutes" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Release v$Version is LIVE!" -ForegroundColor Green
Write-Host ""
