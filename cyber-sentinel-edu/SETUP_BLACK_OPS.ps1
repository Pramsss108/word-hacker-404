Write-Host "Initializing BLACK OPS Toolchain Setup..." -ForegroundColor Cyan
Write-Host "Target: WSL2 (Kali Linux Engine)" -ForegroundColor Gray

# Check WSL
$wslStatus = wsl --status
if ($?) {
    Write-Host "✅ WSL Engine Detected." -ForegroundColor Green
} else {
    Write-Host "❌ WSL Engine NOT Found. Please run INIT_CYBER_SENTINEL.ps1 first." -ForegroundColor Red
    exit
}

Write-Host "`n[STEP 1/3] Updating Repositories..." -ForegroundColor Yellow
wsl -u root apt-get update

Write-Host "`n[STEP 2/3] Installing Advanced Warfare Tools..." -ForegroundColor Yellow
Write-Host "   > Installing Bettercap (The Sniper/Ghost)..."
wsl -u root apt-get install -y bettercap

Write-Host "   > Installing MDK4 (The Swarm)..."
wsl -u root apt-get install -y mdk4

Write-Host "   > Installing HCXDumpTool (The Vacuum)..."
wsl -u root apt-get install -y hcxdumptool

Write-Host "   > Installing MacChanger (The Ghost)..."
wsl -u root apt-get install -y macchanger

Write-Host "`n[STEP 3/3] Verifying Installation..." -ForegroundColor Yellow
$check = wsl which bettercap
if ($check) {
    Write-Host "✅ BLACK OPS ARMORY INSTALLED SUCCESSFULLY." -ForegroundColor Green
    Write-Host "   The new modules are now ready to interface with the engine." -ForegroundColor Gray
} else {
    Write-Host "⚠️ Installation might have failed. Please check your internet connection." -ForegroundColor Red
}

