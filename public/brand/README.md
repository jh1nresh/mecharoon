# Mecharoon brand package

Use the descriptor-bearing primary logo as the default Mecharoon logo. Use the
compact lockup for navigation and product chrome, and the standalone symbol
only when the product name is already visible.

## Quick selection inside the ZIP

- `logos/mecharoon-logo-primary.svg` — official logo with descriptor on light surfaces.
- `logos/mecharoon-logo-reverse.svg` — official color-accent logo on Deep Ink.
- `logos/mecharoon-logo-mono.svg` — one-color Deep Ink logo.
- `logos/mecharoon-logo-mono-reverse.svg` — one-color Warm Off-White logo.
- `logos/mecharoon-logo-compact.svg` — compact symbol-and-wordmark lockup without descriptor.
- `logos/mecharoon-logo-compact-mono.svg` — one-color compact lockup.
- `logos/mecharoon-logo-compact-mono-reverse.svg` — reverse one-color compact lockup.
- `logos/mecharoon-logo-stacked.svg` — stacked logo for square and portrait layouts.
- `logos/mecharoon-wordmark.svg` — wordmark-only asset.
- `logos/mecharoon-logo-primary-preview.png` — off-white review preview.
- `symbols/mecharoon-symbol-color.svg` — three-band symbol at 24px and above.
- `symbols/mecharoon-symbol-micro-color.svg` — dedicated two-band symbol at 16–20px.
- `banners/mecharoon-banner-1600x600.*` — wide brand banner.
- `banners/mecharoon-social-1200x630.*` — social and Open Graph banner.
- `symbols/` — standalone SVG, PNG, and favicon variants.
- `guidelines/mecharoon-brand-guide.md` — full construction and usage guide.

The repository mirrors these masters under `public/brand/`; running
`npm run brand:export` rebuilds every raster export and the portable ZIP.

## Non-negotiable rules

- Deep Ink `#0B1F2A` is the authority color.
- Reserved Green `#2C755F` appears at the single reserved transaction point
  and at the approved handoff point in the outlined double `oo`.
- The official concept symbol keeps one centered green point.
- Do not mirror the arc terminals, close the bands, add radiating animation,
  or use the primary three-band symbol below 24px.
- Do not edit the outlined double `oo` wordmark. Its parent and child rings
  remain separate.

The full construction, palette, typography, and misuse rules are in
`brand.md` at the repository root and in the packaged brand guide.
