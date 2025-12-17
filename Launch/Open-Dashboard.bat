@echo off
TITLE Word Hacker 404 - Control Center
COLOR 0B

:: 1. Navigate to the script's folder (Launch)
cd /d "%~dp0"

:: 2. Run the Dashboard (It is now right here)
powershell -ExecutionPolicy Bypass -File "master-dashboard.ps1"

pause
