Write-Host "========================================"  -ForegroundColor Cyan
Write-Host " WH404 - FRESH DEV START" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Killing old processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*WH404*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "[2/4] Clearing Vite cache..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "node_modules\.vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue

Write-Host "[3/4] Starting dev server with hot reload..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " DEV SERVER STARTING" -ForegroundColor Green
Write-Host " Hot reload: ENABLED" -ForegroundColor Green
Write-Host " Changes will refresh automatically!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

npm run tauri:dev
