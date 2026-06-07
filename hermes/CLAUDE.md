# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hermes is a Tauri desktop application for managing and launching executables, built primarily to support Old School RuneScape (OSRS) tooling — launching RuneLite with specific plugin configurations, managing farming herb presets, etc. It has a React/TypeScript frontend and a Rust backend.

This is one of several OSRS-related projects that may share a consolidated repository.

## Common Commands

### Development
- `npm run dev` — Start Vite dev server (port 5173)
- `npm run tauri dev` — Run full Tauri app in dev mode (frontend + Rust backend)

### Build & Install
- `npm run build` — TypeScript compile + Vite build (output in `/dist/`)
- `npm run tauri build` — Build bundled desktop application (MSI installer)
- `powershell -ExecutionPolicy Bypass -File install.ps1` — Quiet-install the built MSI
- Build output: `src-tauri/target/release/bundle/msi/`

### Shell Environment (Claude Code on Windows)
When running commands from Claude Code's bash shell, `npm` and `cargo` are not on PATH by default. Prefix commands with:
```
export PATH="/c/Program Files/nodejs:$HOME/.cargo/bin:$PATH"
```

### Testing
- `npm run test` — Run frontend tests (Vitest, jsdom environment)
- `npm run test:watch` — Run frontend tests in watch mode
- `npx vitest run src/App.test.tsx` — Run a single test file
- Rust backend tests: `cd src-tauri && cargo test`

## Architecture

**Frontend → Tauri IPC → Rust Backend → JSON file storage**

### Frontend (`src/`)
- **Entry**: `main.tsx` → `App.tsx` (all state management lives here)
- **Components**: `LauncherCard.tsx` (display), `LauncherModal.tsx` (create/edit form), `HerbSelector.tsx` (OSRS farming herb preset picker for RuneLite plugin settings)
- **Types**: `types.ts` defines `LauncherConfig` and `LauncherFormData`
- **Styling**: `styles.css` — dark theme with gold accent (`#c9a227`), CSS variables
- **Tests**: Co-located `*.test.tsx` files + `test/setup.ts` (mocks `@tauri-apps/api/core`) + `test/helpers.ts`

### Backend (`src-tauri/src/`)
- **Entry**: `main.rs` calls `hermes_lib::run()`
- **`lib.rs`**: All backend logic — data structures, persistence, Tauri commands, and unit tests
- **Tauri IPC commands**: `get_launchers`, `add_launcher`, `update_launcher`, `delete_launcher`, `launch_app`
- **Persistence**: JSON file at `~/Documents/Hermes/launchers.json` — uses `USERPROFILE` env var, shared across dev and installed builds (avoids Tauri `app_data_dir()` which had permission issues with NSIS-installed builds)
- **Argument parsing**: Uses `shell_words` crate to respect quoted strings

### Key conventions
- Rust structs use `#[serde(rename_all = "camelCase")]` to match frontend TypeScript interfaces
- Frontend communicates with backend exclusively through `invoke()` from `@tauri-apps/api/core`
- UUIDs generated server-side (Rust) for launcher IDs
