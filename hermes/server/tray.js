// Tray entry point. Starts the Hermes Express server in-process AND shows a
// Windows notification-area (system tray) icon with a right-click menu. This is
// what the logon task launches (via run.cmd / run-hidden.vbs) so Hermes has a
// visible, clickable presence while running in the background.
//
// The tray is powered by systray2 (a self-contained Go helper binary, no .NET
// dependency). If the tray helper can't start for any reason, the server still
// runs — the icon is a convenience, not a dependency, so its errors are caught
// and never take the server down.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

import { createApp, HOST, PORT } from './server.js';

const require = createRequire(import.meta.url);
const SysTray = require('systray2').default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICON_PATH = path.join(__dirname, '..', 'src-tauri', 'icons', 'icon.ico');
const APP_URL = `http://localhost:${PORT}`;

let httpServer = null;

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createApp().listen(PORT, HOST, () => resolve(server));
    server.on('error', reject);
  });
}

/** Open the app in the user's default browser. */
function openBrowser() {
  // `start "" <url>` is a cmd builtin; the empty "" is the (unused) window title.
  spawn('cmd', ['/c', 'start', '', APP_URL], { detached: true, stdio: 'ignore' }).unref();
}

// Build and show the tray. Fully self-contained: any failure is logged and
// swallowed so the already-running server is never affected (systray2 spawns its
// helper process asynchronously, so onError/onExit are only valid after ready()).
function startTray() {
  let systray;
  try {
    const icon = fs.readFileSync(ICON_PATH).toString('base64'); // Windows wants ICO base64
    const itemOpen = { title: 'Open Hermes', tooltip: 'Open Hermes in your browser', enabled: true };
    const itemRestart = { title: 'Restart server', tooltip: 'Restart the Hermes server', enabled: true };
    const itemQuit = { title: 'Quit', tooltip: 'Stop Hermes and remove the icon', enabled: true };

    systray = new SysTray({
      menu: {
        icon,
        title: 'Hermes',
        tooltip: 'Hermes',
        items: [itemOpen, SysTray.separator, itemRestart, itemQuit],
      },
      copyDir: true, // copy the helper binary to a stable temp dir (robust paths)
    });

    systray.onClick(async (action) => {
      switch (action.item.title) {
        case itemOpen.title:
          openBrowser();
          break;
        case itemRestart.title:
          try {
            if (httpServer) await new Promise((r) => httpServer.close(r));
            httpServer = await startServer();
            console.log('[hermes] server restarted');
          } catch (e) {
            console.error('[hermes] restart failed:', e);
          }
          break;
        case itemQuit.title:
          if (httpServer) httpServer.close();
          await systray.kill(true); // also exits this node process
          break;
      }
    }).catch((e) => console.error('[hermes] tray onClick failed:', e));
  } catch (e) {
    console.error('[hermes] tray init failed, running headless:', e);
    return Promise.resolve();
  }

  return systray
    .ready()
    .then(() => {
      // _process exists now — safe to attach these.
      systray.onError((err) => console.error('[hermes] tray error:', err));
      systray.onExit((code) => console.log(`[hermes] tray helper exited (${code}); running headless`));
      console.log('[hermes] tray icon ready');
    })
    .catch((e) => console.error('[hermes] tray icon unavailable, running headless:', e));
}

async function main() {
  httpServer = await startServer();
  console.log(`[hermes] serving on ${APP_URL}`);
  await startTray();
}

main().catch((e) => {
  console.error('[hermes] failed to start:', e);
  process.exit(1);
});
