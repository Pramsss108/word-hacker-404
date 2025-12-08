@echo off
REM One-Click Release Script
REM Double-click to release new version

echo ========================================
echo  WH404 Desktop Downloader - Release
echo ========================================
echo.

REM Get version from package.json
for /f "tokens=2 delims=:, " %%a in ('findstr /C:"\"version\"" package.json') do set VERSION=%%~a

echo Current Version: %VERSION%
echo.
echo This will:
echo   1. Build the installer
echo   2. Create GitHub release
echo   3. Upload installer
echo   4. Auto-update website download links
echo.

set /p CONFIRM="Continue with release v%VERSION%? (Y/N): "
if /i not "%CONFIRM%"=="Y" goto :cancel

echo.
echo Starting automated release...
echo.

powershell -ExecutionPolicy Bypass -File "one-click-release.ps1" -Version %VERSION%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo  SUCCESS! Release v%VERSION% is LIVE
    echo ========================================
    echo.
    echo Your app is now available for download at:
    echo https://wordhacker404.me/
    echo.
) else (
    echo.
    echo ========================================
    echo  ERROR! Release failed
    echo ========================================
    echo.
)

pause
goto :end

:cancel
echo.
echo Release cancelled.
echo.
pause

:end
