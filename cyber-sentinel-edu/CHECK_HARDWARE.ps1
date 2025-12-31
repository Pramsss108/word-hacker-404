# Cyber Sentinel Edu - Hardware Check
# Run this to see if your WiFi Adapter is detected.

$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

Write-Host "🔍 HARDWARE REALITY CHECK" -ForegroundColor Cyan
Write-Host "---------------------------------------------------"

# 1. Check for USBIPD
Write-Host "1. Checking for USB Bridge..." -NoNewline
if (Get-Command "usbipd" -ErrorAction SilentlyContinue) {
    Write-Host " FOUND ✅" -ForegroundColor Green
} else {
    Write-Host " MISSING ❌" -ForegroundColor Red
    Write-Host "   (You need this to connect the USB Adapter to the App)" -ForegroundColor Yellow
}

# 2. Check for WiFi Adapters
Write-Host "`n2. Scanning for WiFi Adapters..."
$adapters = Get-NetAdapter | Where-Object { $_.InterfaceDescription -like "*Wireless*" -or $_.InterfaceDescription -like "*Wi-Fi*" -or $_.MediaType -eq "802.3" }

if ($adapters) {
    foreach ($a in $adapters) {
        Write-Host "   Found: $($a.Name) - $($a.InterfaceDescription)" -ForegroundColor Green
    }
} else {
    Write-Host "   NO WIFI ADAPTERS FOUND ❌" -ForegroundColor Red
}

Write-Host "`n---------------------------------------------------"
Write-Host "Press Enter to exit..."
Read-Host
