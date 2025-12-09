@echo off
echo ========================================
echo   WH404 Desktop - Fresh Dev Start
echo ========================================
echo.
echo [1/4] Killing old instances...
taskkill /F /IM "WH404 Downloader.exe" 2>nul
timeout /t 1 /nobreak >nul

echo [2/4] Clearing caches...
cd /d "%~dp0"
if exist ".vite" rmdir /s /q ".vite" 2>nul
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite" 2>nul
if exist "dist" rmdir /s /q "dist" 2>nul

echo [3/4] Starting dev server...
echo.
echo ========================================
echo   Dev server starting...
echo   Hot reload is ACTIVE - changes will
echo   auto-refresh the app!
echo ========================================
echo.

npm run tauri:dev

pause
