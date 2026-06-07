# bank-sync

Syncs RuneLite bank data to Cloudflare KV via a Worker. The watcher reads data from the "Dude Where's My Stuff" (DWMS) RuneLite plugin and uploads bank snapshots. Part of a larger collection of OSRS-related projects.

## Architecture

- **watcher/** — Node.js script (no dependencies) that polls `$rsprofile--1.properties` every 10 minutes and POSTs bank data to the worker. Runs on Windows via Task Scheduler at login (`run-hidden.vbs` wraps `run.cmd`).
- **worker/** — Cloudflare Worker with KV storage. Endpoints: `POST /bank` (ingest), `GET /accounts`, `GET /bank/:hash`. All require Bearer auth.
- **watcher/parse.js** — Parsing module, tested separately. Reads DWMS item data and resolves account display names from rsprofile keys.

## Data source

DWMS stores data in `~/.runelite/profiles2/$rsprofile--1.properties` with keys like:
- `dudewheresmystuff.rsprofile.<hash>.<category>.<storage>=<data>`
- Items are `itemIdxqty` comma-separated, some with a `timestamp;` prefix
- Account display names come from `rsprofile.rsprofile.<hash>.displayName`
- `-1` item IDs are empty slots, filtered out during parsing

## Commands

```
# Run tests
node --test watcher/parse.test.js

# Run watcher (needs .env)
cd watcher && node sync.js

# Deploy worker
cd worker && npx wrangler deploy
```

## Watcher env vars

See `watcher/.env.example`: `BANK_WORKER_URL`, `BANK_AUTH_SECRET`

## Worker secrets

`AUTH_SECRET` — set via `npx wrangler secret put AUTH_SECRET`
