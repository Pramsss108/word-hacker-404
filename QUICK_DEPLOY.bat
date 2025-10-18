@echo off
REM Quick Deploy - One-Click Autonomous Deployment for Word Hacker 404
REM Usage: double-click this file or run from command line

cd /d "D:\A scret project\Word hacker 404"
powershell.exe -ExecutionPolicy Bypass -File "deploy.ps1" -Message "feat: Quick deployment update"
pause