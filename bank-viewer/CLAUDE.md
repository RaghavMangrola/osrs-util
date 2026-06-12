# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
bun run dev      # local dev server at http://localhost:8788
bun run check    # TypeScript type-check (no emit)
bun run deploy   # deploy to Cloudflare Pages
```

> The project uses `npm` scripts in `package.json`; swap `npm run` for `bun run` per global preference.

No automated tests exist. Before handing off changes: run `bun run check`, start `bun run dev`, verify `http://localhost:8788` renders correctly, and hit `/api/bank` to confirm JSON shape.

## Architecture

**Static frontend + Cloudflare Pages Function**

```
public/          # static site served directly by Cloudflare Pages
  index.html
  app.js         # vanilla JS UI — fetches /api/bank and renders herb grid
  styles.css
functions/
  api/bank.ts    # Pages Function (TypeScript) — reads KV, returns herb/seed data
wrangler.toml    # Cloudflare config: project name, KV binding, BANK_KEY var
```

### Data flow

1. `app.js` calls `GET /api/bank` on page load and on refresh button click.
2. `functions/api/bank.ts` reads raw bank JSON from KV (`BANK_KV` binding, key from `BANK_KEY` env var or namespace scan).
3. The function parses the payload using `extractItems` — handles multiple export formats (array of objects, id→quantity maps) by walking the JSON tree.
4. `buildHerbRows` maps items against `HERB_DEFINITIONS` to produce per-herb rows: clean/grimy counts, total, secondaries with quantities, craftable potion counts, and banked 4-dose equivalents.
5. Seeds are merged, deduped, and sorted alphabetically.
6. Response shape: `{ sourceKey, herbs: HerbRow[], seeds: BankItem[] }`.

### Key data structures (`bank.ts`)

- `HERB_DEFINITIONS` — static array defining every herb: item IDs, secondary ingredient IDs, and which potions they produce (with `secondaryIndexes` linking potions to their specific secondaries).
- `POTION_DOSE_IDS` — maps potion names to their 4/3/2/1-dose item IDs for banked-dose calculation.
- `HerbRow` — the main API response unit per herb; `potions[]` each carry a `bankedFourDose` stack.

### Frontend rendering (`app.js`)

- `renderHerbTable` builds a `.herb-sections` container; each herb gets a `.herb-section` via `createHerbSection`.
- `buildHerbRecipeRows` converts a herb's potions/secondaries into display rows (one row per potion, with up to 3 secondary slots, a craftable count slot, and a banked-dose slot).
- The recipe grid uses a fixed 8-column layout (spacers fill unused slots).
- Item icons come from `https://static.runelite.net/cache/item/icon/<id>.png`; broken images are hidden gracefully.

## Style conventions

- 2-space indentation throughout.
- CSS class names: lowercase hyphenated (`herb-section`, `item-stack`, `potion-chip`).
- API response field names are stable: `clean`, `grimy`, `total`, `potions`, `secondaries`, `iconUrl`, `bankedFourDose`.
- No build step for the frontend — `public/` is plain HTML/JS/CSS deployed as-is.

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`: runs `npm ci`, `npm run check`, then `wrangler pages deploy public`. Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` GitHub secrets.
