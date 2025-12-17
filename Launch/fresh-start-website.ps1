$ErrorActionPreference = "SilentlyContinue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   FRESH START: MAIN WEBSITE (PORT 1420)  " -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Kill Processes
Write-Host "`n[1/5] Killing Node.js processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe
taskkill /F /IM vite.exe

# 2. Navigate to Root
$root = "D:\A scret project\Word hacker 404"
Set-Location $root

# 3. Clean Install
Write-Host "`n[2/5] Cleaning old files (node_modules)..." -ForegroundColor Yellow
if (Test-Path "node_modules") { Remove-Item "node_modules" -Recurse -Force }
if (Test-Path "package-lock.json") { Remove-Item "package-lock.json" -Force }

# 4. Install
Write-Host "`n[3/5] Installing fresh dependencies..." -ForegroundColor Cyan
npm install

# 5. Build
Write-Host "`n[4/5] Building project..." -ForegroundColor Cyan
npm run build

# 6. Run
Write-Host "`n[5/5] Starting Dev Server..." -ForegroundColor Green
npm run dev
