# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hermes is a local **web app** for managing and launching executables, built primarily to support Old School RuneScape (OSRS) tooling — launching RuneLite with specific plugin configurations, managing farming herb presets, etc. A React/TypeScript frontend (served as a static build) talks over HTTP to a small **Node.js + Express server** that runs on the same PC and performs the native work (spawning processes, reading/writing RuneLite config files). The page is installable as a **PWA**.

This is one of several OSRS-related projects that may share a consolidated repository.

### History: from Tauri to web app
Hermes was originally a Tauri desktop app (React frontend + Rust backend over Tauri IPC, shipped as an NSIS installer). It was converted to a web app + local server. The conversion was small because the frontend talked to the backend through a single seam — `invoke(command, args)` — which now resolves to an HTTP shim (`src/api.ts`) instead of Tauri IPC. The old Rust/Tauri code in **`src-tauri/` is kept on disk as reference** (it holds the source-of-truth logic the server was ported from, plus its unit tests) but is no longer on the run path. The scrapped `get_supply_usage` command was **not** ported.

## Common Commands

### Development
- `npm run serve` — Start the Express server (serves the built `dist/` + the API on http://localhost:4317). Build first.
- `npm run start` — `npm run build && npm run serve` (one-shot: build then serve).
- `npm run dev` — Start the Vite dev server (port 5173) with HMR. It proxies `/api` → `http://127.0.0.1:4317`, so run `npm run serve` (or just `node server/server.js`) alongside it for the API.

### Build
- `npm run build` — TypeScript compile + Vite build (output in `/dist/`, including the PWA manifest/SW/icons copied from `public/`).

### Run as a background service (always available)
A Windows Task Scheduler task named **"Hermes Server"** (trigger: **At log on**) runs `server/run-hidden.vbs` → `server/run.cmd` → `node server/tray.js` with no console window. `tray.js` starts the server **and** shows a system-tray icon (right-click: Open Hermes / Restart server / Quit). The server stays up at http://localhost:4317. Build at least once first; Node must be on PATH.
- Register/replace the task (needs admin): `Register-ScheduledTask` or `schtasks /Create /TN "Hermes Server" /SC ONLOGON /RL LIMITED /F /TR "wscript.exe \"<repo>\hermes\server\run-hidden.vbs\""`.
- `npm run tray` runs the tray+server in the foreground (for testing); `npm run serve` runs the server **headless** (no icon).

### Install as a PWA
With the server running, open http://localhost:4317 in Edge/Chrome and choose **Install Hermes** — this gives a Start-menu/taskbar icon and a standalone app window.

### Legacy Tauri (reference only, not the run path)
- `npm run tauri dev` / `npm run tauri build` / `npm run install:app` / `npm run update:app` still exist and operate on `src-tauri/`, but Hermes no longer ships as a desktop app.

### Shell Environment (Claude Code on Windows)
When running commands from Claude Code's bash shell, `npm` and `cargo` are not on PATH by default. Prefix commands with:
```
export PATH="/c/Program Files/nodejs:$HOME/.cargo/bin:$PATH"
```

### Testing
- `npm run test` — Run frontend tests (Vitest, jsdom; scoped to `src/**`)
- `npm run test:watch` — Run frontend tests in watch mode
- `npx vitest run src/App.test.tsx` — Run a single test file
- `npm run server:test` — Run the Express server's tests (Node's built-in test runner, `server/*.test.js`)
- Legacy Rust backend tests (reference): `cd src-tauri && cargo test`

## Architecture

**Frontend (React, static build) → HTTP → Express server (Node) → JSON / properties file storage**

### Frontend (`src/`)
- **Entry**: `main.tsx` → `App.tsx` (all state management lives here). `main.tsx` also registers the PWA service worker.
- **Transport**: `api.ts` exports an `invoke(command, args)` function — a drop-in for Tauri's `invoke` that POSTs to `/api/invoke/:command` and rejects with the server's error string. Components import `invoke` from `./api` (not `@tauri-apps/api/core`).
- **Components**: `LauncherCard.tsx` (display), `LauncherModal.tsx` (create/edit form), `HerbSelector.tsx` (OSRS farming herb preset picker for RuneLite plugin settings), `SupplyTracker.tsx` (**scrapped** — see "Scrapped: supply tracker" below; on disk but not rendered, still imports the old Tauri API)
- **Types**: `types.ts` defines `LauncherConfig` and `LauncherFormData`
- **Styling**: `styles.css` — dark theme with gold accent (`#c9a227`), CSS variables
- **PWA**: `index.html` links `public/manifest.webmanifest`; `public/sw.js` is a minimal (non-caching) service worker present only to make the app installable. Icons in `public/icon-*.png` are copied from `src-tauri/icons/`.
- **Tests**: Co-located `*.test.tsx` files + `test/setup.ts` (mocks the `../api` module) + `test/helpers.ts`. Vitest is scoped to `src/**` so it doesn't pick up the server's Node-test files.

### Server (`server/`)
- **`server.js`** — Express app. Binds to **`127.0.0.1` only** (port 4317; override with `HERMES_PORT`) — it can launch arbitrary executables, so it must never be exposed to the network. Serves the built `dist/` as static files and dispatches `POST /api/invoke/:command` to a handler map. ES modules (the package is `"type": "module"`). Exports `createApp`/`HOST`/`PORT`; auto-starts only when run directly.
- **`tray.js`** — the **service entry point** (what `run.cmd` launches). Starts the server in-process (imports `createApp`) and shows a Windows system-tray icon via **`systray2`** (a Go helper binary — chosen over `trayicon`, whose .NET helper failed to load here). Menu: Open Hermes / Restart server / Quit. Tray failures are caught and never take the server down (it falls back to headless).
- **Commands** (handlers): `get_launchers`, `add_launcher`, `update_launcher`, `delete_launcher`, `launch_app` (`launchers.js`); `get_current_herb`, `update_herb`, `get_valid_herbs` (`herb.js`); `get_herb_seeds` (`seeds.js`). These are ports of the Rust commands in `src-tauri/src/lib.rs`. `get_supply_usage` (scrapped) was not ported.
- **`launchers.js`** — launcher CRUD + `launch_app`. Spawns detached, stdio-ignored child processes (`crypto.randomUUID()` for ids). `splitArgs()` is a small tokenizer that matches the Rust `shell_words` quoting rules (avoids a dependency and any glob/operator/variable expansion).
- **`herb.js`** — reads/rewrites the RuneLite Hydra farming properties file in place, **preserving CRLF-vs-LF** line endings (`splitLines` mirrors Rust `str::lines()`).
- **`seeds.js`** — herb-seed bank counts for the `funmaxxing` account, merging bank + seed-vault quantities.
- **`dwms.js`** — `parseProperties` / `parseItemList`, **vendored from `bank-sync/watcher/parse.js`** (kept in sync by hand, mirroring how the Rust backend kept its own copy).
- **`run.cmd` / `run-hidden.vbs`** — Task Scheduler at-login launchers (adapted from bank-sync).
- **Tests**: `server/*.test.js` on Node's built-in test runner (`npm run server:test`).
- **Persistence**: JSON file at `~/Documents/Hermes/launchers.json` via `USERPROFILE` — **same path the Rust backend used**, so existing launchers are picked up unchanged.

### Legacy backend (`src-tauri/src/`, reference only)
- `lib.rs` holds the original Rust implementation of every command (+ ~170 unit tests) that `server/` was ported from. No longer built or run; kept as the porting reference.

### Scrapped: supply tracker
A "Supplies" tab that estimated how fast bank items were being consumed (units/day, days-to-empty). **Scrapped** because the numbers were untrustworthy: short observation windows wildly extrapolated daily rates, and equipment leaving/re-entering the bank (e.g. equipping a dragon defender) read as "consumption." The code is intentionally **kept on disk, not deleted**:
- Frontend: `src/components/SupplyTracker.tsx` (orphaned — not imported/rendered; still imports the old Tauri API).
- Backend: **not ported to the Express server.** The original `get_supply_usage` + `build_report` / `compute_usage` remain only in `lib.rs` (reference).
- Data source: the bank-sync watcher's `dwms-history.jsonl` writes are **disabled** (see bank-sync/CLAUDE.md).
- To revive: port `get_supply_usage` into `server/` (e.g. a `supply.js` handler) and add the import + a "supplies" tab/route in `App.tsx`, and re-enable `recordHistory`/`seedHistoryState` in the watcher.

### Key conventions
- Wire payloads are camelCase JSON (the React `types.ts` interfaces are the source of truth)
- Frontend communicates with the server exclusively through `invoke()` from `src/api.ts` (HTTP) — command names and argument shapes are unchanged from the Tauri version
- UUIDs generated server-side (Node `crypto.randomUUID()`) for launcher IDs
- **Argument parsing**: `splitArgs()` in `server/launchers.js` respects quoted strings (matches the old Rust `shell_words` behavior)
