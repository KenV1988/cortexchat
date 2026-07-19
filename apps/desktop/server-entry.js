// Runs inside Electron's Node (ELECTRON_RUN_AS_NODE) as a child process.
// Loads Next.js from the deployed web bundle and serves it on PORT.
const http = require('node:http');
const path = require('node:path');

const dir = process.env.CORTEXCHAT_WEB_DIR;
if (!dir) throw new Error('CORTEXCHAT_WEB_DIR not set');
const port = Number(process.env.PORT ?? 31700);

// Resolve next from the bundle itself, not from this file's node_modules —
// the desktop shell deliberately has no runtime dependencies of its own.
const next = require(require.resolve('next', { paths: [dir] }));

const app = next({ dev: false, dir });
app.prepare().then(() => {
  const handler = app.getRequestHandler();
  http
    .createServer((req, res) => handler(req, res))
    .listen(port, '127.0.0.1', () => {
      console.log(`cortexchat server listening on http://127.0.0.1:${port}`);
    });
});
