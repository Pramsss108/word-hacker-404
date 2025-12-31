@echo off
title CYBER SENTINEL - GOD MODE LAUNCHER
color 0a
cls
echo ==================================================
echo    CYBER SENTINEL: GOD MODE INITIATED
echo ==================================================
echo.
echo [SYSTEM] Changing directory to cyber-sentinel-edu...
cd "cyber-sentinel-edu"

echo [SYSTEM] Installing dependencies (just in case)...
call npm install

echo [SYSTEM] Cleaning cache to ensure updates...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"

echo [SYSTEM] Launching Tauri Dev Server...
echo [INFO] ---------------------------------------------------
echo [INFO] IF THE APP DOES NOT OPEN:
echo [INFO] 1. Close this window.
echo [INFO] 2. Run this file again.
echo [INFO]
echo [INFO] IF CHANGES ARE NOT VISIBLE:
echo [INFO] Press CTRL + R inside the app to force refresh.
echo [INFO] ---------------------------------------------------
echo.
call npm run tauri dev

pause
