// Hermes local server. Replaces the Tauri Rust backend: the React app (built into
// ../dist) is served as static files and talks to these handlers over HTTP
// instead of Tauri IPC. Each command maps 1:1 to the old `invoke()` commands.
//
// SECURITY: this server can launch arbitrary executables, so it binds to the
// loopback interface only (127.0.0.1) and must never be exposed to the network.

import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import * as launchers from './launchers.js';
import * as herb from './herb.js';
import * as seeds from './seeds.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HOST = '127.0.0.1';
const PORT = Number(process.env.HERMES_PORT) || 4317;
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Command name -> handler(args). Handlers may be sync or async; they return the
// payload on success or throw an Error (message is surfaced to the client).
// `get_supply_usage` is intentionally omitted (scrapped supply tracker).
const handlers = {
  get_launchers: launchers.getLaunchers,
  add_launcher: launchers.addLauncher,
  update_launcher: launchers.updateLauncher,
  delete_launcher: launchers.deleteLauncher,
  launch_app: launchers.launchApp,
  get_current_herb: herb.getCurrentHerb,
  update_herb: herb.updateHerb,
  get_valid_herbs: herb.getValidHerbs,
  get_herb_seeds: seeds.getHerbSeeds,
};

export function createApp() {
  const app = express();
  app.use(express.json());

  app.post('/api/invoke/:command', async (req, res) => {
    const handler = handlers[req.params.command];
    if (!handler) {
      res.status(404).json({ error: `Unknown command: ${req.params.command}` });
      return;
    }
    try {
      const result = await handler(req.body || {});
      res.json(result === undefined ? null : result);
    } catch (e) {
      res.status(400).json({ error: e && e.message ? e.message : String(e) });
    }
  });

  app.use(express.static(DIST_DIR));

  // SPA fallback for any non-API navigation (keeps PWA deep links working).
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });

  return app;
}

function start() {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.warn(`[hermes] dist/ not built yet (${DIST_DIR}). Run "npm run build" first.`);
  }
  createApp().listen(PORT, HOST, () => {
    console.log(`[hermes] serving on http://localhost:${PORT}`);
  });
}

// Run only when executed directly (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start();
}

export { handlers, HOST, PORT };
