<#
.SYNOPSIS
    Master Build Script for Word Hacker 404 (Production Pipeline)
    Builds the Tauri Desktop App and the Smart Stub Installer.

.DESCRIPTION
    1. Builds the Core Desktop App (Rust + React) using Tauri.
    2. Packages the Core App into a portable .zip archive.
    3. Builds the Stub Installer (Rust) optimized for size.
    4. Generates 'latest.json' with SHA256 hashes for auto-updates.
    5. Outputs everything to a clean 'dist' folder ready for upload.

.NOTES
    Author: Word Hacker 404 Engineering
    Date: December 7, 2025
#>

$ErrorActionPreference = "Stop"
$ScriptRoot = $PSScriptRoot

# ----------------------------------------------------------------
# 🎨 Helper Functions
# ----------------------------------------------------------------
function Write-Step {
    param([string]$Message)
    Write-Host "`n🚀 $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# ----------------------------------------------------------------
# 🔍 Pre-Flight Checks
# ----------------------------------------------------------------
Write-Step "Checking Environment..."

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-ErrorMsg "Rust (cargo) is not found in PATH."
    Write-Host "👉 If you just installed Rust, please RESTART your terminal/VS Code and run this again." -ForegroundColor Yellow
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-ErrorMsg "Node.js (npm) is not found."
    exit 1
}

# ----------------------------------------------------------------
# 1️⃣ Build Core Desktop App (Tauri)
# ----------------------------------------------------------------
Write-Step "Phase 1: Building Core Desktop App (Tauri)..."

$AppDir = Join-Path $ScriptRoot "desktop-downloader"
Set-Location $AppDir

# Install Deps
Write-Host "   Installing dependencies..." -ForegroundColor Gray
npm install --silent | Out-Null

# Setup Sidecars (Ensure they exist)
Write-Host "   Configuring sidecars..." -ForegroundColor Gray
if (Test-Path ".\setup-sidecars.ps1") {
    .\setup-sidecars.ps1
}

# Build Tauri App
Write-Host "   Compiling Rust backend & React frontend..." -ForegroundColor Gray
# We use 'build' to generate the release binary
Write-Host "   Running: npx tauri build" -ForegroundColor Gray
npx tauri build

if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Tauri Build Failed."
    exit 1
}

# ----------------------------------------------------------------
# 2️⃣ Package Core App (Zip)
# ----------------------------------------------------------------
Write-Step "Phase 2: Packaging Core App..."

# Define paths
$TauriTargetDir = Join-Path $AppDir "src-tauri\target\release"
$DistDir = Join-Path $ScriptRoot "dist"
$AppReleaseZip = Join-Path $DistDir "app-release.zip"

# Clean Dist Dir
if (Test-Path $DistDir) { Remove-Item $DistDir -Recurse -Force }
New-Item -ItemType Directory -Path $DistDir | Out-Null

# Identify files to zip (Exe + Sidecars + Resources)
# Note: Tauri builds usually output the main exe in release/
# Sidecars might be in release/ or release/bin depending on config.
# We will grab the main exe and any .exe sidecars.

$MainExe = Join-Path $TauriTargetDir "WH404 Downloader.exe"

if (-not (Test-Path $MainExe)) {
    Write-ErrorMsg "Could not find built executable at: $MainExe"
    Write-Host "Check if the Tauri build completed successfully."
    exit 1
}

# Create a temporary staging folder for zipping
$StagingDir = Join-Path $DistDir "staging"
New-Item -ItemType Directory -Path $StagingDir | Out-Null

# Copy Main Exe
Copy-Item $MainExe -Destination $StagingDir

# Copy Sidecars (yt-dlp, ffmpeg)
# They are usually in the same folder or a bin subfolder in target/release
$Sidecars = Get-ChildItem $TauriTargetDir -Filter "*.exe" | Where-Object { $_.Name -ne "word-hacker-downloader.exe" }
foreach ($File in $Sidecars) {
    Copy-Item $File.FullName -Destination $StagingDir
}

# Zip it up
Write-Host "   Compressing to app-release.zip..." -ForegroundColor Gray
Compress-Archive -Path "$StagingDir\*" -DestinationPath $AppReleaseZip -Force

# Cleanup Staging
Remove-Item $StagingDir -Recurse -Force

Write-Success "Core App Packaged: $AppReleaseZip"

# ----------------------------------------------------------------
# 3️⃣ Build Stub Installer
# ----------------------------------------------------------------
Write-Step "Phase 3: Building Smart Stub Installer..."

$InstallerDir = Join-Path $ScriptRoot "installer-stub"
Set-Location $InstallerDir

Write-Host "   Compiling Installer (Release Mode)..." -ForegroundColor Gray
cargo build --release

if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Installer Build Failed."
    exit 1
}

$InstallerExe = Join-Path $InstallerDir "target\release\wh404-installer.exe"
$FinalInstaller = Join-Path $DistDir "WH404 Downloader.exe"

Copy-Item $InstallerExe -Destination $FinalInstaller
Write-Success "Installer Built: $FinalInstaller"

# ----------------------------------------------------------------
# 4️⃣ Generate Metadata (latest.json)
# ----------------------------------------------------------------
Write-Step "Phase 4: Generating Update Metadata..."

$Hash = Get-FileHash $AppReleaseZip -Algorithm SHA256
$JsonContent = @{
    version = "1.0.0" # TODO: Read from package.json
    url = "https://github.com/Pramsss108/wh404-desktop-builds/releases/download/v1.0.0/app-release.zip"
    hash = $Hash.Hash
} | ConvertTo-Json

$JsonPath = Join-Path $DistDir "latest.json"
$JsonContent | Set-Content -Path $JsonPath

Write-Success "Metadata Generated: $JsonPath"

# ----------------------------------------------------------------
# 🏁 Final Summary
# ----------------------------------------------------------------
Write-Step "Build Complete! 🥂"
Write-Host "Output Directory: $DistDir" -ForegroundColor Magenta
Write-Host "---------------------------------------------------"
Write-Host "1. Upload 'app-release.zip' to GitHub Releases."
Write-Host "2. Upload 'latest.json' to GitHub Releases."
Write-Host "3. Distribute 'WH404 Downloader.exe' to users."
Write-Host "---------------------------------------------------"

# Return to root
Set-Location $ScriptRoot
