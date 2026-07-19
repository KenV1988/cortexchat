# Windows one-click installer

**To install:** download
[`install-cortexchat.bat`](https://raw.githubusercontent.com/KenV1988/cortexchat/main/installers/windows/install-cortexchat.bat)
(right-click → Save link as…), double-click it, and follow the prompts.
Windows SmartScreen may warn about an unrecognized script — click
*More info → Run anyway* (the script is ~100 lines, readable in Notepad).

What it does, in order:

1. Installs Node.js LTS via winget if missing.
2. Enables pnpm via corepack (ships with Node — nothing extra installed).
3. Downloads the latest cortexchat source from GitHub.
4. Installs dependencies and builds the app (a few minutes, once).
5. Creates a **cortexchat** shortcut on your Desktop.

**To run:** double-click the Desktop shortcut. A console window starts the
server and your browser opens http://localhost:3000. Keep the console
window open while using the app. For the installed-app experience, click
the install icon in Chrome/Edge's address bar (see `docs/RUNNING.md`).

**Your data is safe across reinstalls:** chats and memory live in
`%LOCALAPPDATA%\cortexchat-data\`, which the installer never touches. The
app itself lives in `%LOCALAPPDATA%\cortexchat\`.

**To uninstall:** delete `%LOCALAPPDATA%\cortexchat`, optionally
`%LOCALAPPDATA%\cortexchat-data` (your chats), and the Desktop shortcut.
Nothing else is touched — no registry entries, no services.

**Optional (recommended) after install:**
- [Ollama](https://ollama.com) + `ollama pull qwen2.5:0.5b` for free local
  models.
- A free [OpenRouter key](https://openrouter.ai/keys) in
  `%LOCALAPPDATA%\cortexchat\.env` for the big free cloud models.

A signed native `cortexchat-Setup.exe` (no console window, proper
installer UX) is built by the `Windows installer` GitHub Actions workflow —
see `apps/desktop/README.md`.
