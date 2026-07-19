// Electron main process: boots the bundled Next.js server as a child
// process (using Electron's own Node via ELECTRON_RUN_AS_NODE) and opens a
// window on it once it responds. The web bundle is produced by `pnpm deploy`
// in CI and shipped under resources/web — see ../../.github/workflows/release-windows.yml.
const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const PORT = 31700;
let serverProc;

function webDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'web')
    : path.join(__dirname, '..', '..', 'dist-deploy', 'web');
}

function startServer() {
  const dir = webDir();
  serverProc = spawn(process.execPath, [path.join(__dirname, 'server-entry.js')], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      CORTEXCHAT_WEB_DIR: dir,
      PORT: String(PORT),
      // Chats/memory live in the OS per-user data dir, so app updates and
      // reinstalls never touch them.
      DATABASE_PATH: path.join(app.getPath('userData'), 'cortexchat.sqlite'),
      MODEL_REGISTRY_PATH: path.join(dir, 'models.yaml'),
      DB_MIGRATIONS_DIR: path.join(dir, 'drizzle'),
    },
    stdio: 'inherit',
  });
  serverProc.on('exit', (code) => {
    if (code !== 0 && !app.isQuitting) {
      console.error(`cortexchat server exited with code ${code}`);
      app.quit();
    }
  });
}

function waitForServer(attempts = 120) {
  return new Promise((resolve, reject) => {
    const tick = (left) => {
      const req = http.get({ host: '127.0.0.1', port: PORT, path: '/' }, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (left <= 0) return reject(new Error('cortexchat server did not start'));
        setTimeout(() => tick(left - 1), 500);
      });
    };
    tick(attempts);
  });
}

app.whenReady().then(async () => {
  startServer();
  await waitForServer();

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    title: 'cortexchat',
  });
  win.loadURL(`http://127.0.0.1:${PORT}`);
  // External links open in the system browser, not inside the app shell.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

app.on('window-all-closed', () => {
  app.isQuitting = true;
  app.quit();
});

app.on('quit', () => {
  serverProc?.kill();
});
