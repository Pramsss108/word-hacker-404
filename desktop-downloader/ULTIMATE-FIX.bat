@echo off
echo ========================================
echo   ULTIMATE FIX - Force Complete Reset
echo ========================================
echo.

echo [1/6] Killing ALL processes...
taskkill /F /IM "WH404 Downloader.exe" 2>nul
taskkill /F /IM "node.exe" 2>nul
taskkill /F /IM "vite.exe" 2>nul
timeout /t 2 /nobreak >nul

echo [2/6] Clearing ALL caches...
cd /d "%~dp0"
if exist ".vite" rmdir /s /q ".vite" 2>nul
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite" 2>nul
if exist "dist" rmdir /s /q "dist" 2>nul
if exist "src-tauri\target\debug" rmdir /s /q "src-tauri\target\debug" 2>nul

echo [3/6] Clearing browser cache files...
if exist "%LOCALAPPDATA%\com.tauri.dev" rmdir /s /q "%LOCALAPPDATA%\com.tauri.dev" 2>nul
if exist "%APPDATA%\com.tauri.dev" rmdir /s /q "%APPDATA%\com.tauri.dev" 2>nul

echo [4/6] Clearing Node modules cache...
npm cache clean --force 2>nul

echo [5/6] Reinstalling dependencies...
npm install

echo [6/6] Starting FRESH dev server...
echo.
echo ========================================
echo   READY! Premium toggle will be visible
echo   Look for: ✨ Premium button in header
echo ========================================
echo.

npm run tauri:dev

pause
