@echo off
SETLOCAL EnableDelayedExpansion
echo ========================================
echo   ULTIMATE FIX - Force Complete Reset
echo ========================================
echo.

echo [1/5] Killing ALL processes...
taskkill /F /IM "WH404 Downloader.exe" >nul 2>&1
taskkill /F /IM "node.exe" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/5] Clearing ALL caches...
cd /d "%~dp0"
echo Current directory: %CD%
if exist ".vite" (
    echo Deleting .vite...
    rmdir /s /q ".vite"
)
if exist "node_modules\.vite" (
    echo Deleting node_modules\.vite...
    rmdir /s /q "node_modules\.vite"
)
if exist "dist" (
    echo Deleting dist...
    rmdir /s /q "dist"
)

echo [3/5] Clearing Tauri cache...
if exist "%LOCALAPPDATA%\com.tauri.dev" (
    echo Deleting Tauri AppData...
    rmdir /s /q "%LOCALAPPDATA%\com.tauri.dev"
)

echo [4/5] Clearing npm cache...
call npm cache clean --force

echo [5/5] Starting dev server...
echo.
echo ========================================
echo   Dev server starting...
echo   Premium toggle will be visible!
echo ========================================
echo.

call npm run tauri:dev

if errorlevel 1 (
    echo.
    echo ERROR! Dev server failed to start.
    echo Check the error messages above.
    pause
    exit /b 1
)

pause
