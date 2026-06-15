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
Tauri desktop app (React/TypeScript frontend, Rust backend) for managing and launching OSRS executables — RuneLite configs, farming herb presets, etc. Builds to an MSI installer.

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

# hermes: dev mode
cd hermes && npm run tauri dev

# hermes: run frontend tests
cd hermes && npm run test

# hermes: build installer
cd hermes && npm run tauri build

# hermes: hot-swap update an installed build (no installer)
cd hermes && npm run update:app
```
