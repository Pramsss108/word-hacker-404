@echo off
echo ========================================
echo  WH404 - FRESH DEV START
echo ========================================
echo.
echo [1/4] Killing old processes...
taskkill /F /IM "WH404 Downloader.exe" >nul 2>&1
timeout /t 1 /nobreak >nul

echo [2/4] Clearing Vite cache...
if exist "node_modules\.vite" rmdir /S /Q "node_modules\.vite" >nul 2>&1
if exist ".vite" rmdir /S /Q ".vite" >nul 2>&1
if exist "dist" rmdir /S /Q "dist" >nul 2>&1

echo [3/4] Starting dev server with hot reload...
echo.
echo ========================================
echo  DEV SERVER STARTING
echo  Hot reload: ENABLED
echo  Changes will refresh automatically!
echo ========================================
echo.

npm run tauri:dev
