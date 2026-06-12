# Repository Guidelines

## Project Structure & Module Organization

This is a small Cloudflare Pages app for viewing OSRS herb, seed, secondary, and potion data from an OSRS bank payload stored in Cloudflare KV.

- `public/` contains the static site: `index.html`, `app.js`, and `styles.css`.
- `public/fonts/` contains the bundled RuneScape-style web font.
- `functions/api/bank.ts` contains the Pages Function that reads KV and returns normalized herb and seed data.
- `.github/workflows/deploy.yml` checks TypeScript and deploys the Pages app on pushes to `main`.
- `wrangler.toml` defines the Pages project, KV binding, and optional local `BANK_KEY`.
- `README.md` documents local setup and deployment.
- There is currently no dedicated test directory.

## Build, Test, and Development Commands

- `npm install`: install local dependencies.
- `npm run dev`: start Cloudflare Pages local development server for `public/`.
- `npm run check`: run TypeScript type checking for Pages Functions.
- `npm run deploy`: deploy the Pages site and function to Cloudflare.

Local development uses Wrangler's local KV store. To test against real data, mirror a remote KV value into local KV or deploy to Cloudflare.

## Coding Style & Naming Conventions

Use TypeScript for Cloudflare Functions and plain JavaScript/CSS for the static UI. Keep code dependency-light and avoid introducing a build step unless it is clearly needed.

- Use 2-space indentation.
- Prefer descriptive names such as `buildHerbRows`, `itemIconUrl`, and `renderHerbTable`.
- Keep API response fields stable and explicit: `clean`, `grimy`, `total`, `potions`, `secondaries`, `iconUrl`, `bankedFourDose`.
- Keep CSS class names lowercase with hyphens, for example `potion-chip` and `bank-table`.
- Keep the frontend dependency-free unless a build step is clearly justified.

## Testing Guidelines

There is no automated test framework yet. Before handing off changes:

- Run `npm run check`.
- Start `npm run dev` and verify `http://localhost:8788`.
- Check `/api/bank` returns JSON with combined herb rows and seed data.
- Visually verify the herb sections, item icons, potion icons, zero quantities, banked potion counts, and mobile horizontal scrolling.

If tests are added later, prefer focused API tests for `functions/api/bank.ts` parsing and normalization behavior.

## Commit & Pull Request Guidelines

Use short imperative commit messages, for example `Add potion icons to herb table`.

Pull requests should include:

- A brief summary of behavior changes.
- Screenshots for UI/style changes.
- Notes about KV keys, bindings, secrets, or deployment configuration changes.
- Verification steps, including `npm run check`.

## Security & Configuration Tips

Never expose Cloudflare API tokens in browser code or committed files. The browser should only call `/api/bank`; KV access belongs in the Pages Function. Keep `BANK_KEY` configurable in `wrangler.toml` or Cloudflare Pages environment variables. GitHub Actions deployments require `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.
