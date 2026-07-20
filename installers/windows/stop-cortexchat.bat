@echo off
setlocal enableextensions
set "FOUND="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":3000 .*LISTENING"') do (
  taskkill /F /PID %%p >nul 2>nul
  set "FOUND=1"
)
if defined FOUND (
  echo cortexchat stopped.
) else (
  echo cortexchat was not running.
)
pause
