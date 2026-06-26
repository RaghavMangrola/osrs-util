// Tray entry point. Starts the Hermes Express server in-process AND shows a
// Windows notification-area (system tray) icon. This is what the logon task
// launches (via run.cmd / run-hidden.vbs) so Hermes has a visible, clickable
// presence while running in the background.
//
// The icon itself is drawn by a small PowerShell sidecar (tray.ps1) using
// WinForms NotifyIcon — the one native way to tell a left-click (open the site)
// apart from a right-click (show the menu). The sidecar owns only the icon UI;
// it writes one-word actions to stdout and this process does the real work:
//
//   open    -> open Hermes in the default browser
//   restart -> restart the in-process Express server
//   quit    -> stop the server and exit
//
// If the sidecar can't start for any reason, the server still runs — the icon
// is a convenience, not a dependency, so its errors are caught and never take
// the server down (it falls back to headless).

import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

import { createApp, HOST, PORT } from './server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICON_PATH = path.join(__dirname, '..', 'src-tauri', 'icons', 'icon.ico');
const TRAY_SCRIPT = path.join(__dirname, 'tray.ps1');
const APP_URL = `http://localhost:${PORT}`;

let httpServer = null;
let trayProc = null;

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

async function restartServer() {
  try {
    if (httpServer) await new Promise((r) => httpServer.close(r));
    httpServer = await startServer();
    console.log('[hermes] server restarted');
  } catch (e) {
    console.error('[hermes] restart failed:', e);
  }
}

/** Stop the server, kill the tray sidecar, and exit this process. */
function quit() {
  if (httpServer) httpServer.close();
  if (trayProc) trayProc.kill();
  process.exit(0);
}

// Spawn the PowerShell tray sidecar and act on the actions it prints. Fully
// self-contained: any failure is logged and swallowed so the already-running
// server is never affected (it just runs headless without an icon).
function startTray() {
  try {
    trayProc = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-STA', // WinForms NotifyIcon requires a single-threaded apartment
        '-ExecutionPolicy', 'Bypass',
        '-File', TRAY_SCRIPT,
        '-IconPath', ICON_PATH,
      ],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch (e) {
    console.error('[hermes] tray spawn failed, running headless:', e);
    return;
  }

  readline.createInterface({ input: trayProc.stdout }).on('line', (line) => {
    switch (line.trim()) {
      case 'open':
        openBrowser();
        break;
      case 'restart':
        restartServer();
        break;
      case 'quit':
        quit();
        break;
    }
  });

  trayProc.stderr.on('data', (d) => console.error('[hermes] tray:', String(d).trimEnd()));
  trayProc.on('error', (e) => console.error('[hermes] tray error:', e));
  trayProc.on('exit', (code) => {
    console.log(`[hermes] tray helper exited (${code}); running headless`);
    trayProc = null;
  });
  console.log('[hermes] tray icon ready');
}

async function main() {
  httpServer = await startServer();
  console.log(`[hermes] serving on ${APP_URL}`);
  startTray();
}

// Never leave the tray sidecar orphaned when this process goes away.
process.on('exit', () => { if (trayProc) trayProc.kill(); });
process.on('SIGINT', quit);
process.on('SIGTERM', quit);

main().catch((e) => {
  console.error('[hermes] failed to start:', e);
  process.exit(1);
});
