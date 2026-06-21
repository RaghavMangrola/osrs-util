# osrs-utilities

Monorepo for Old School RuneScape tooling. Each subdirectory is an independent project with its own tech stack and deploy pipeline.

## Projects

### bank-sync/
Syncs RuneLite bank data to Cloudflare KV via a Worker. A Node.js watcher polls the "Dude Where's My Stuff" plugin data and POSTs snapshots to a Cloudflare Worker. Runs on Windows via Task Scheduler.

- See [bank-sync/CLAUDE.md](bank-sync/CLAUDE.md) for details.

### bank-viewer/
Cloudflare Pages site (osrs.paalmlabs.com) that displays bank data from the bank-sync KV namespace — herb bank table plus advisor modules. Static frontend in `public/`, Pages Functions API in `functions/api/`. Deployed via GitHub Actions (`.github/workflows/deploy-bank-viewer.yml`).

- See [bank-viewer/CLAUDE.md](bank-viewer/CLAUDE.md) for details.

### hermes/
Local web app for managing and launching OSRS executables — RuneLite configs, farming herb presets, etc. A React/TypeScript frontend (static build) talks over HTTP to a loopback-only Node.js + Express server that spawns processes and edits RuneLite config files. Installable as a PWA; runs as a background service via Task Scheduler. (Originally a Tauri desktop app — the Rust code in `src-tauri/` is kept as reference only.)

- See [hermes/CLAUDE.md](hermes/CLAUDE.md) for details.

## Quick reference

```
# bank-sync: run tests
node --test bank-sync/watcher/parse.test.js

# bank-sync: deploy worker
cd bank-sync/worker && npx wrangler deploy

# bank-viewer: dev mode
cd bank-viewer && npm run dev

# bank-viewer: typecheck
cd bank-viewer && npm run check

# bank-viewer: deploy manually
cd bank-viewer && npm run deploy

# hermes: build + serve the web app (http://localhost:4317)
cd hermes && npm run start

# hermes: dev mode (Vite HMR; run "npm run serve" alongside for the API)
cd hermes && npm run dev

# hermes: run frontend tests
cd hermes && npm run test

# hermes: run server tests
cd hermes && npm run server:test

# hermes: run as a background service — point a Task Scheduler "At log on"
# task at hermes/server/run-hidden.vbs (build once first)
```
