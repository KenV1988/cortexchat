# cortexchat desktop shell (Electron)

A minimal Electron wrapper that turns the cortexchat web app + server into
a native desktop application (`cortexchat-Setup-<version>.exe` on Windows).
The shell has no runtime dependencies of its own: it boots the bundled
Next.js server in a child process using Electron's own Node runtime and
opens a window on `http://127.0.0.1:31700`. Chats and memory are stored in
the OS per-user data directory (`%APPDATA%/cortexchat` on Windows), so app
updates never touch them.

## Status: experimental

**The .exe must be built on a Windows machine** — the app uses a native
SQLite module that cannot be cross-compiled from Linux/macOS. The GitHub
Actions workflow [`release-windows.yml`](../../.github/workflows/release-windows.yml)
does exactly this on GitHub's free `windows-latest` runners:

- **Manual run:** GitHub → Actions → "Windows installer" → *Run workflow*.
  The finished installer appears as a downloadable artifact on the run.
- **Release:** push a tag like `v0.1.0` — the workflow builds the
  installer and attaches it to a GitHub Release.

This pipeline is committed but has not yet had a green run (the
repository's Actions were unavailable when it was written). Expect to
iterate: build-machine-only problems (native module rebuilds, packaging
layout) can only surface on the Windows runner itself.

## Why this directory is not part of the pnpm workspace

`pnpm-workspace.yaml` deliberately lists `apps/web` rather than `apps/*`:
installing Electron (~100 MB of binaries) should not be a cost every
contributor pays on `pnpm install`. CI installs this directory standalone
with `npm install` only when actually building the desktop app.

## How the pieces fit

1. CI builds the web app, then `pnpm --filter @cortexchat/web deploy`
   produces `dist-deploy/web`: the app with a real, symlink-free
   `node_modules` (workspace packages inlined) — the layout
   electron-builder can package.
2. `config/models.yaml` and `packages/db/drizzle/` are copied into the
   bundle; `main.js` points the server at them via the same env vars the
   Docker image uses (`MODEL_REGISTRY_PATH`, `DB_MIGRATIONS_DIR`).
3. `@electron/rebuild` recompiles `better-sqlite3` against Electron's ABI.
4. `electron-builder` packs everything into an NSIS one-click installer.
