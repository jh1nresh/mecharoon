# Mecharoon

Financial control for autonomous teams.

Mecharoon is an independent product concept for bounding delegated agent
budgets, reconciling external payment states, and linking spend to tasks,
evidence, verdicts, and work receipts.

## Current status

This repository contains the product landing page and an illustrative
transaction walkthrough. The control ledger and rail adapters are not
implemented yet. Benchmark entries on the page are targets, not results.

## Run locally

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>.

## Verify

```bash
npm run lint
npm run build
npm run brand:export
```

The production artifact is emitted to `out/` as a static site. It does not
require a Next.js server at runtime.

## Brand assets

The final logo, standalone symbols, micro marks, banners, PNG exports, and
portable ZIP package live under `public/brand/`. Run `npm run brand:export` to
rebuild the raster and package outputs from the versioned SVG masters.

## Public deployment

Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin before deployment. Without
it, the page is deliberately emitted with `noindex, nofollow` and a localhost
metadata base.

## Product boundary

- No custody
- No card issuing
- No customer balances
- No new payment rail
- No claim of globally exactly-once external settlement
