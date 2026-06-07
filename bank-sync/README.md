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

### 4. Configure the watcher

Copy `watcher/.env.example` to `watcher/.env` and fill in your values:

```
BANK_WORKER_URL=https://bank-sync.<your-subdomain>.workers.dev
BANK_AUTH_SECRET=<same secret from step 2>
```

### 5. Register the Task Scheduler job

The watcher runs automatically at login via Windows Task Scheduler. To register it:

```powershell
$action = New-ScheduledTaskAction -Execute "cmd.exe" `
  -Argument '/c "C:\Users\raghav\Developer\bank-sync\watcher\start.cmd"' `
  -WorkingDirectory "C:\Users\raghav\Developer\bank-sync\watcher"
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName "RuneLite Bank Sync" `
  -Action $action -Trigger $trigger -Settings $settings `
  -Description "Watches RuneLite bank memory and syncs to Cloudflare KV" -Force
```

To remove the task: `Unregister-ScheduledTask -TaskName "RuneLite Bank Sync" -Confirm:$false`

The task:
- Starts at every login
- Restarts automatically up to 3 times (1-minute delay) if it crashes
- Skips launching a second instance if already running

`start.cmd` reads credentials from `watcher/.env` and launches `sync.js`.
The watcher detects file changes (debounced 3s) and also syncs hourly as a fallback.

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
