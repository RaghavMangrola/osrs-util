# bank-sync

Syncs RuneLite bank memory data to Cloudflare KV via a Worker.

## Setup

### 1. Create the KV namespace

```bash
cd worker
npm install
npx wrangler kv namespace create BANK_KV
```

Paste the returned `id` into `wrangler.toml`.

### 2. Set the auth secret

```bash
npx wrangler secret put AUTH_SECRET
# enter a random string, e.g. from: openssl rand -hex 32
```

### 3. Deploy the Worker

```bash
npm run deploy
```

### 4. Run the watcher

```bash
set BANK_WORKER_URL=https://bank-sync.<your-subdomain>.workers.dev
set BANK_AUTH_SECRET=<same secret from step 2>
node watcher/sync.js
```

## API

All endpoints require `Authorization: Bearer <secret>`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/bank` | Ingest bank snapshots |
| GET | `/accounts` | List all known accounts |
| GET | `/bank/:hash` | Get latest snapshot for an account |

## KV structure

- `accounts` → `{ [hash]: { name, snapshotTime, uploadedAt } }`
- `bank:{hash}` → `{ hash, name, worldType, snapshotTime, uploadedAt, items: [{id, qty}] }`
