@echo off
setlocal
cd /d "%~dp0"

echo === WORD HACKER 404 · DESKTOP DOWNLOADER ===

if not exist node_modules (
  echo First run detected. Installing dependencies...
  call npm install || goto :error
)

echo Launching dev preview. Keep this window open.
call npm start
goto :eof

:error
echo.
echo Something went wrong. Share this window with Copilot for help.
pause
