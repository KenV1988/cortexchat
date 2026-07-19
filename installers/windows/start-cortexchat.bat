@echo off
setlocal enableextensions
title cortexchat server - keep this window open while using the app
set "DATA_DIR=%LOCALAPPDATA%\cortexchat-data"
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
set "DATABASE_PATH=%DATA_DIR%\cortexchat.sqlite"
cd /d "%LOCALAPPDATA%\cortexchat\apps\web"
echo Starting cortexchat at http://localhost:3000 ...
echo (closing this window stops cortexchat)
start "" cmd /c "timeout /t 4 >nul & start http://localhost:3000"
pnpm exec next start -p 3000
pause
