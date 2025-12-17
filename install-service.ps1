# Trash Hunter Service Installer
# MUST BE RUN AS ADMINISTRATOR

$ErrorActionPreference = "Stop"

# Check for Admin privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "YOU MUST RUN THIS SCRIPT AS ADMINISTRATOR!"
    exit 1
}

Write-Host "STARTING TRASH HUNTER SERVICE INSTALLATION..." -ForegroundColor Cyan

# 1. Build the Service Binary
Write-Host "Building Rust Service (Release Mode)..." -ForegroundColor Yellow
cd "src-tauri"
cargo build --release --bin trash-hunter-service
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed!"
}
cd ..

$serviceBinPath = "$PWD\src-tauri\target\release\trash-hunter-service.exe"

if (-not (Test-Path $serviceBinPath)) {
    Write-Error "Service binary not found at: $serviceBinPath"
}

# 2. Stop and Delete Existing Service (if any)
Write-Host "Cleaning up old service instances..." -ForegroundColor Yellow
$existing = Get-Service "TrashHunterService" -ErrorAction SilentlyContinue
if ($existing) {
    if ($existing.Status -eq "Running") {
        Stop-Service "TrashHunterService" -Force
    }
    sc.exe delete "TrashHunterService" | Out-Null
    Start-Sleep -Seconds 2
}

# 3. Register the New Service
Write-Host "Registering Service with Windows SCM..." -ForegroundColor Yellow
$cmdArgs = "create TrashHunterService binPath= `"$serviceBinPath`" start= auto displayname= `"Trash Hunter AI Engine`""
Start-Process -FilePath "sc.exe" -ArgumentList $cmdArgs -Wait -NoNewWindow

# 4. Start the Service
Write-Host "Starting the Engine..." -ForegroundColor Green
Start-Service "TrashHunterService"

# 5. Verify
$status = Get-Service "TrashHunterService"
if ($status.Status -eq "Running") {
    Write-Host "SUCCESS: Trash Hunter Engine is RUNNING!" -ForegroundColor Green
    Write-Host "   - PID: $($status.Id)"
    Write-Host "   - Security Level: PARANOID"
    Write-Host "   - IPC Pipe: \\.\pipe\trash-hunter-ipc"
} else {
    Write-Error "Service failed to start."
}
