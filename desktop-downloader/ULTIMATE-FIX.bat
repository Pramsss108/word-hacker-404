@echo off
SETLOCAL EnableDelayedExpansion
echo ========================================
echo   ULTIMATE FIX - Force Complete Reset
echo ========================================
echo.

echo [1/7] Killing ALL processes...
taskkill /F /IM "WH404 Downloader.exe" >nul 2>&1
taskkill /F /IM "node.exe" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/7] Clearing ALL caches...
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

echo [3/7] Clearing Tauri cache...
if exist "%LOCALAPPDATA%\com.tauri.dev" (
    echo Deleting Tauri AppData...
    rmdir /s /q "%LOCALAPPDATA%\com.tauri.dev"
)

echo [4/7] Clearing npm cache...
call npm cache clean --force

echo [5/7] Installing npm dependencies...
call npm install
if errorlevel 1 goto install_fail

echo [6/7] Building latest assets...
call npm run build
if errorlevel 1 goto build_fail

echo [7/7] Starting dev server...
echo.
echo ========================================
echo   Dev server starting...
echo   Premium toggle will be visible!
echo ========================================
echo.

call npm run tauri:dev

if errorlevel 1 goto dev_fail

goto finish

:install_fail
echo.
echo ERROR! npm install failed.
echo Check the logs above for details.
pause
exit /b 1

:build_fail
echo.
echo ERROR! npm run build failed.
echo Fix build errors and rerun this script.
pause
exit /b 1

:dev_fail
echo.
echo ERROR! Dev server failed to start.
echo Check the error messages above.
pause
exit /b 1

:finish

pause
