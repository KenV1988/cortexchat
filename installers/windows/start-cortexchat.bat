@echo off
setlocal enableextensions
title cortexchat server - keep this window open while using the app
set "DATA_DIR=%LOCALAPPDATA%\cortexchat-data"
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
set "DATABASE_PATH=%DATA_DIR%\cortexchat.sqlite"
cd /d "%LOCALAPPDATA%\cortexchat\apps\web"
echo Starting cortexchat at http://localhost:3000 ...
echo (closing this window stops cortexchat)
rem "nobrowser" is passed by the hidden autostart launcher - opening a browser
rem tab on every login would be obnoxious.
if /i not "%~1"=="nobrowser" (
  start "" cmd /c "timeout /t 4 >nul & start http://localhost:3000"
)
rem Invoke Next's CLI directly through node - no dependency on pnpm being
rem on PATH at run time.
node node_modules\next\dist\bin\next start -p 3000
pause
