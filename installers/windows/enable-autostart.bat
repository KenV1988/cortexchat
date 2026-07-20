@echo off
setlocal enableextensions
title cortexchat autostart setup
set "APPDIR=%LOCALAPPDATA%\cortexchat"

if not exist "%APPDIR%\start-cortexchat.bat" (
  echo cortexchat is not installed yet - run install-cortexchat.bat first.
  pause
  exit /b 1
)

echo Registering cortexchat to start automatically (hidden) at every login...
schtasks /Create /F /TN "cortexchat" /SC ONLOGON ^
  /TR "wscript.exe \"%APPDIR%\installers\windows\run-hidden.vbs\""
if errorlevel 1 (
  echo Failed to create the scheduled task.
  pause
  exit /b 1
)

echo Starting cortexchat in the background now...
wscript.exe "%APPDIR%\installers\windows\run-hidden.vbs"

echo.
echo Done. cortexchat now runs in the background at http://localhost:3000
echo whenever you're logged in - no console window.
echo   To stop it:            stop-cortexchat.bat
echo   To remove autostart:   disable-autostart.bat
echo.
echo IMPORTANT for 24/7 access: stop your PC from sleeping -
echo Settings ^> System ^> Power ^> "Make my device sleep after": Never (when plugged in).
echo.
pause
