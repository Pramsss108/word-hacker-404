@echo off
echo ========================================
echo  WH404 Downloader - Electron Dev Mode
echo ========================================
echo.
echo Starting Electron app...
echo.

cd /d "%~dp0"
call npm run electron:dev

pause
