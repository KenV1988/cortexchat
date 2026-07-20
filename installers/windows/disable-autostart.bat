@echo off
setlocal enableextensions
schtasks /Delete /F /TN "cortexchat" 2>nul
echo cortexchat autostart removed (the app itself is still installed).
pause
