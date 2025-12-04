#!/usr/bin/env pwsh
# Quick Release Script with Full Automation
# Usage: .\quick-release-clean.ps1 -Version "1.0.1"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

$ErrorActionPreference = "Continue"
$releaseRepo = "Pramsss108/wh404-desktop-builds"

function Write-Step {
    param([string]$Message)
    Write-Host "`n$Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if GitHub CLI is installed
Write-Step "Checking GitHub CLI..."
$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghInstalled) {
    Write-Host "GitHub CLI not found. Installing..." -ForegroundColor Yellow
    try {
        winget install GitHub.cli
        Write-Success "GitHub CLI installed"
        Write-Host "Please run 'gh auth login' to authenticate, then run this script again" -ForegroundColor Yellow
        exit 0
    } catch {
        Write-ErrorMsg "Failed to install GitHub CLI. Please install manually from https://cli.github.com/"
        exit 1
    }
}

# Check authentication
Write-Step "Verifying GitHub authentication..."
try {
    gh auth status | Out-Null
    Write-Success "Authenticated"
} catch {
    Write-ErrorMsg "Not authenticated. Please run: gh auth login"
    exit 1
}

# Build the app
Write-Step "Building desktop app..."
npm run package:win
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Build failed!"
    exit 1
}
Write-Success "Build completed"

# Find installer
Write-Step "Finding installer..."
$installer = Get-ChildItem -Path "release" -Filter "*.exe" -File | Select-Object -First 1
if (-not $installer) {
    Write-ErrorMsg "No .exe file found in release/ directory"
    exit 1
}

$installerPath = $installer.FullName
$installerName = $installer.Name
$fileSize = [math]::Round($installer.Length / 1MB, 2)
Write-Success "Found: $installerName ($fileSize MB)"

# Create git tag
$tagName = "desktop-v$Version"
Write-Step "Creating git tag: $tagName"

# Delete existing tag if it exists (suppress all output)
$null = git tag -d $tagName 2>&1
$null = git push origin --delete $tagName 2>&1

$tagMessage = "Desktop App v$Version - $installerName"
git tag -a $tagName -m $tagMessage
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Failed to create tag"
    exit 1
}

git push origin $tagName
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Failed to push tag"
    exit 1
}
Write-Success "Tag pushed to GitHub"

# Create GitHub release
Write-Step "Creating GitHub release in $releaseRepo..."

# Build release notes
$releaseTitle = "WH404 Desktop Downloader v$Version"
$releaseBody = "## WH404 Desktop Downloader v$Version`n`n"
$releaseBody += "Windows desktop app for downloading YouTube videos and audio offline.`n`n"
$releaseBody += "### Features`n"
$releaseBody += "- Download videos in multiple resolutions`n"
$releaseBody += "- Extract audio in various formats`n"
$releaseBody += "- Trim and crop videos`n"
$releaseBody += "- Format conversion support`n"
$releaseBody += "- FFmpeg and yt-dlp bundled`n"
$releaseBody += "- Auto-update checker`n`n"
$releaseBody += "### Installation`n"
$releaseBody += "1. Download the installer below`n"
$releaseBody += "2. Run the .exe file`n"
$releaseBody += "3. Launch WH404 YT Downloader`n"
$releaseBody += "4. Paste YouTube URLs and download`n`n"
$releaseBody += "### File Info`n"
$releaseBody += "- Size: $fileSize MB`n"
$releaseBody += "- Platform: Windows 10/11 64-bit`n"
$releaseBody += "- Auto-updates: Enabled`n`n"
$releaseBody += "### Support`n"
$releaseBody += "Email: team@bongbari.com"

try {
    # Delete existing release if it exists
    gh release delete $tagName --repo $releaseRepo --yes 2>$null
    
    # Create new release with file
    gh release create $tagName $installerPath --title $releaseTitle --notes $releaseBody --target main --repo $releaseRepo
    
    Write-Success "Release created and installer uploaded"
} catch {
    Write-ErrorMsg "Failed to create GitHub release: $_"
    exit 1
}

# Generate download URL based on uploaded asset name
$exeAssetName = (gh api repos/$releaseRepo/releases/tags/$tagName --jq ".assets[] | select(.name | endswith(\".exe\")) | .name" 2>$null | Select-Object -First 1)
if ([string]::IsNullOrWhiteSpace($exeAssetName)) {
    Write-ErrorMsg "Could not locate .exe asset in release. Check GitHub release assets manually."
    exit 1
}
$exeAssetName = $exeAssetName.Trim()
$encodedName = [System.Uri]::EscapeDataString($exeAssetName)
$downloadUrl = "https://github.com/$releaseRepo/releases/download/$tagName/$encodedName"

Write-Step "Updating website download URLs..."

# Update App.tsx
$appFile = "..\src\App.tsx"
if (Test-Path $appFile) {
    $appContent = Get-Content $appFile -Raw
    $appContent = $appContent -replace "https://github\.com/Pramsss108/wh404-desktop-builds/releases/download/desktop-v[\d\.]+/[^'\""]+", $downloadUrl
    Set-Content $appFile -Value $appContent -NoNewline
    Write-Success "Updated App.tsx"
}

# Update ToolsPage.tsx
$toolsFile = "..\src\components\ToolsPage.tsx"
if (Test-Path $toolsFile) {
    $toolsContent = Get-Content $toolsFile -Raw
    $toolsContent = $toolsContent -replace "https://github\.com/Pramsss108/wh404-desktop-builds/releases/download/desktop-v[\d\.]+/[^'\""]+", $downloadUrl
    Set-Content $toolsFile -Value $toolsContent -NoNewline
    Write-Success "Updated ToolsPage.tsx"
}

# Commit and push website changes
Write-Step "Deploying website updates..."
cd ..
$commitMsg = "chore: update desktop download URL to v$Version"
git add src/App.tsx src/components/ToolsPage.tsx
git commit -m $commitMsg
git push origin main
Write-Success "Website deployed"

# Summary
Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "RELEASE COMPLETE" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Version:      v$Version" -ForegroundColor Cyan
Write-Host "Tag:          $tagName" -ForegroundColor Cyan
Write-Host "Installer:    $installerName" -ForegroundColor Cyan
Write-Host "Size:         $fileSize MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Release:      https://github.com/$releaseRepo/releases/tag/$tagName" -ForegroundColor Yellow
Write-Host "Download:     $downloadUrl" -ForegroundColor Yellow
Write-Host "Website:      https://wordhacker404.me (updating...)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Users can now download v$Version from your website!" -ForegroundColor Green
Write-Host ""
