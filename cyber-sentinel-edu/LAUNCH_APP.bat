@echo off
:: BatchGotAdmin
:-------------------------------------
REM  --> Check for permissions
    IF "%PROCESSOR_ARCHITECTURE%" EQU "amd64" (
>nul 2>&1 "%SYSTEMROOT%\SysWOW64\cacls.exe" "%SYSTEMROOT%\SysWOW64\config\system"
) ELSE (
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
)

REM --> If error flag set, we do not have admin.
if '%errorlevel%' NEQ '0' (
    echo Requesting administrative privileges...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    set params= %*
    echo UAC.ShellExecute "cmd.exe", "/c ""%~s0"" %params:"=""%", "", "runas", 1 >> "%temp%\getadmin.vbs"

    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    pushd "%CD%"
    CD /D "%~dp0"
:--------------------------------------

title Cyber Sentinel Edu - Launcher
color 0A
cd /d "%~dp0"

echo ==========================================
echo   CYBER SENTINEL EDU - LAUNCHER
echo ==========================================

echo [1/4] Cleaning up background processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] Clearing caches (Safe Mode)...
if exist ".vite" rmdir /s /q ".vite" 2>nul
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite" 2>nul

echo [3/4] Checking dependencies...
if not exist "node_modules" (
    echo [!] Node modules not found. Installing...
    call npm install
)

echo [4/4] Starting Engine...
echo.
echo DO NOT CLOSE THIS BLACK WINDOW!
echo The App will open in a few seconds...
echo.

echo [INFO] Building frontend assets (Stable Mode)...
call npm run build

echo [INFO] Launching App...
call npm run tauri dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Something went wrong.
    pause
)
pause