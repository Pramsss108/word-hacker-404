@echo off
title Installer Builder
color 0B
cd /d "%~dp0"

echo ==========================================
echo   INSTALLER GENERATOR
echo ==========================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "CREATE_INSTALLER.ps1"
pause