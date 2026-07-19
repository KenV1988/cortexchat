@echo off
setlocal enableextensions
title cortexchat installer
echo.
echo  ============================================
echo   cortexchat one-click installer for Windows
echo  ============================================
echo.
echo  This will install cortexchat to %LOCALAPPDATA%\cortexchat
echo  and put a "cortexchat" shortcut on your Desktop.
echo  Your chats are stored separately and survive reinstalls.
echo.
pause

set "INSTALL_DIR=%LOCALAPPDATA%\cortexchat"
set "DATA_DIR=%LOCALAPPDATA%\cortexchat-data"

rem ---------- 1. Node.js ----------
where node >nul 2>nul
if errorlevel 1 (
  echo [1/5] Node.js not found - installing via winget...
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  set "PATH=%ProgramFiles%\nodejs;%PATH%"
) else (
  echo [1/5] Node.js found.
)
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Could not install Node.js automatically.
  echo   Please install it from https://nodejs.org (LTS^) and run this installer again.
  pause
  exit /b 1
)

rem ---------- 2. pnpm via corepack ----------
echo [2/5] Enabling pnpm...
call corepack enable
call corepack prepare pnpm@9.12.0 --activate

rem ---------- 3. Download latest cortexchat ----------
echo [3/5] Downloading cortexchat from GitHub...
if exist "%TEMP%\cortexchat.zip" del /q "%TEMP%\cortexchat.zip"
curl -L -o "%TEMP%\cortexchat.zip" https://codeload.github.com/KenV1988/cortexchat/zip/refs/heads/main
if errorlevel 1 (
  echo   Download failed. Check your internet connection and try again.
  pause
  exit /b 1
)
if exist "%TEMP%\cortexchat-extract" rmdir /s /q "%TEMP%\cortexchat-extract"
mkdir "%TEMP%\cortexchat-extract"
tar -xf "%TEMP%\cortexchat.zip" -C "%TEMP%\cortexchat-extract"
if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%"
move "%TEMP%\cortexchat-extract\cortexchat-main" "%INSTALL_DIR%" >nul

rem ---------- 4. Install dependencies and build ----------
echo [4/5] Installing and building (this takes a few minutes the first time)...
cd /d "%INSTALL_DIR%"
call pnpm install
if errorlevel 1 ( echo   pnpm install failed. & pause & exit /b 1 )
call pnpm build
if errorlevel 1 ( echo   package build failed. & pause & exit /b 1 )
call pnpm --filter @cortexchat/web exec next build
if errorlevel 1 ( echo   web build failed. & pause & exit /b 1 )

rem ---------- 5. Shortcuts ----------
echo [5/5] Creating Desktop shortcut...
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
copy /y "%INSTALL_DIR%\installers\windows\start-cortexchat.bat" "%INSTALL_DIR%\start-cortexchat.bat" >nul
powershell -NoProfile -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\cortexchat.lnk');" ^
  "$s.TargetPath='%INSTALL_DIR%\start-cortexchat.bat';" ^
  "$s.WorkingDirectory='%INSTALL_DIR%';" ^
  "$s.Description='cortexchat - free local-first AI chat';" ^
  "$s.Save()"

echo.
echo  ============================================
echo   Done! Double-click "cortexchat" on your
echo   Desktop to start. Keep that window open
echo   while using the app; closing it stops
echo   the server.
echo.
echo   Optional but recommended:
echo    - Install Ollama from https://ollama.com
echo      then run:  ollama pull qwen2.5:0.5b
echo    - Free OpenRouter key: https://openrouter.ai/keys
echo      put it in %INSTALL_DIR%\.env
echo  ============================================
echo.
pause
