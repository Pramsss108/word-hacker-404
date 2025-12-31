# Cyber Sentinel Edu - Installer Generator
# Run this to CREATE the .msi file to install on other PCs.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "📦 BUILDING INSTALLER (This takes 5-10 mins)..." -ForegroundColor Yellow

# 1. Install Dependencies
Write-Host "   - Checking tools..."
npm install

# 2. Build
Write-Host "   - Compiling code..."
cmd /c "npm run tauri build"

# 3. Show Result
if ($LASTEXITCODE -eq 0) {
    $msi = Get-ChildItem -Path "src-tauri\target\release\bundle\msi" -Filter "*.msi" -Recurse | Select-Object -First 1
    if ($msi) {
        Write-Host "✅ SUCCESS! Installer created:" -ForegroundColor Green
        Write-Host "   $($msi.FullName)" -ForegroundColor Cyan
        Invoke-Item $msi.Directory
    } else {
        Write-Error "Build finished but MSI not found."
    }
} else {
    Write-Error "Build Failed. Check logs above."
}
