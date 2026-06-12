# OSRS Bank Viewer

Small Cloudflare Pages app for viewing herbs and seeds from an OSRS bank payload stored in Cloudflare KV.

## Local development

```sh
npm install
npm run dev
```

The local site runs at `http://localhost:8788` by default.

## Configuration

The Pages Function expects a KV binding named `BANK_KV`, configured in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "BANK_KV"
id = "ec9058b898b14e31b73f64979271b272"
```

If the bank data lives at a known KV key, set `BANK_KEY` as a Pages environment variable or in the `[vars]` block in `wrangler.toml` for local development. The advisor stats default to the hardcoded account `funmaxxing`; `STATS_PLAYER` can override it in the Pages environment or local Wrangler vars. Stats are fetched server-side and cached in `BANK_KV`.

Without `BANK_KEY`, the API scans the namespace for the first JSON value that looks like bank item data.

## Commands

```sh
npm run check
npm run deploy
```

## Deployment on push

Pushes to `main` run `.github/workflows/deploy.yml`, which checks TypeScript and deploys `public/` to the Cloudflare Pages project `osrs-bank-viewer`.

Set these GitHub repository secrets before relying on the workflow:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Pages deploy access.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID for the Pages project.
