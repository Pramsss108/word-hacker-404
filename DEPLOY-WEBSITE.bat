@echo off
TITLE Word Hacker 404 - Master Deployer (Firebase + GitHub)
COLOR 0E

echo ===================================================
echo    DEPLOYING TO PRODUCTION (ALL SYSTEMS)
echo ===================================================
echo.

echo [1/4] Building Website...
call npm run build
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build Failed! Fix errors.
    pause
    exit /b
)

echo.
echo [2/4] Uploading to Google Firebase...
echo (Using global firebase-tools if available, else npx)
call npx firebase-tools deploy
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] NPX failed. Trying global...
    call firebase deploy
)
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Firebase Upload Failed! Check internet/login.
    pause
    exit /b
)

echo.
echo [3/4] Syncing to GitHub...
call git add .
call git commit -m "Auto-Deploy: Production Update"
call git push origin main
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] GitHub Push Failed. (Maybe up to date?)
)

echo.
echo [SUCCESS] ALL SYSTEMS GO!
echo.
echo LIVE: https://word-hacker-404.web.app
echo DOMAIN: https://wordhacker404.me (May take 5m to update)
echo REPO: https://github.com/Pramsss108/word-hacker-404
pause
