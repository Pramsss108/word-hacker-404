# SETUP_USB_PASSTHROUGH.ps1
# Automates the installation of USBIPD-WIN for WSL2
# Run as Administrator

Write-Host "🔌 WORD HACKER 404 - USB PASSTHROUGH SETUP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Gray

# Check for Admin Privileges
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ ERROR: This script requires Administrator privileges." -ForegroundColor Red
    Write-Host "👉 Right-click this file and select 'Run with PowerShell' -> 'Run as Administrator'" -ForegroundColor Yellow
    Pause
    Exit
}

# 1. Install USBIPD-WIN via Winget
Write-Host "1️⃣  Installing usbipd-win..." -ForegroundColor Yellow
try {
    winget install --id=dorssel.usbipd-win -e --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ usbipd-win installed successfully." -ForegroundColor Green
    } else {
        Write-Host "⚠️  Winget installation might have failed or is already installed. Checking..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Winget failed. Please install manually from: https://github.com/dorssel/usbipd-win/releases" -ForegroundColor Red
}

# 2. Verify Installation
Write-Host "`n2️⃣  Verifying installation..." -ForegroundColor Yellow
if (Get-Command "usbipd" -ErrorAction SilentlyContinue) {
    $version = usbipd --version
    Write-Host "✅ Detected usbipd version: $version" -ForegroundColor Green
} else {
    Write-Host "❌ 'usbipd' command not found. You may need to restart your computer." -ForegroundColor Red
    Pause
    Exit
}

# 3. Install USB Tools in Kali
Write-Host "`n3️⃣  Installing USB tools in Kali Linux..." -ForegroundColor Yellow
wsl -d kali-linux bash -c "sudo apt-get update && sudo apt-get install -y usbutils hwdata"

Write-Host "`n✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "👉 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Plug in your USB Wi-Fi Adapter."
Write-Host "2. Open a PowerShell (Admin) window."
Write-Host "3. Run: usbipd list"
Write-Host "4. Find your adapter's BUSID (e.g., 1-2)."
Write-Host "5. Run: usbipd bind --busid <BUSID>"
Write-Host "6. Run: usbipd attach --wsl --busid <BUSID>"
Write-Host ""
Write-Host "(This process will be automated in the app tutorial)" -ForegroundColor Gray
Pause
