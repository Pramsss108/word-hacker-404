# WH404 Trash-Hunter AI - One-Click Release Script
$ErrorActionPreference = "Stop"

Write-Host "🚀 INITIALIZING LAUNCH SEQUENCE..." -ForegroundColor Cyan

# 1. Verification
Write-Host "🔍 Verifying directory..." -ForegroundColor Yellow
if (!(Test-Path "package.json")) {
    Write-Error "ERROR: package.json not found. Run this script from the project root."
}

# 2. Frontend Build
Write-Host "📦 Installing Frontend Dependencies..." -ForegroundColor Green
npm install --silent

Write-Host "🎨 Building React Frontend..." -ForegroundColor Green
npm run build

# 3. Rust/Tauri Build
Write-Host "🦀 Compiling Rust Backend & generating Installer..." -ForegroundColor Green
# We skip signing for local dev (production would need keys)
npm run tauri build

# 4. Success Report
$releasePath = "src-tauri\target\release\bundle\nsis"
if (Test-Path $releasePath) {
    Write-Host "✅ MISSION ACCOMPLISHED." -ForegroundColor Cyan
    Write-Host "installer located at: $releasePath" -ForegroundColor White
    Invoke-Item $releasePath
} else {
    Write-Error "❌ Build failed. Release folder not found."
}
