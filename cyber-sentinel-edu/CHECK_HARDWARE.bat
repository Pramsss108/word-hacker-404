@echo off
title Hardware Reality Check
color 0E
cd /d "%~dp0"

echo ==========================================
echo   HARDWARE CHECKER
echo ==========================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "CHECK_HARDWARE.ps1"
pause