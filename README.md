# BLACK ROYAL ROULETTE — Phase 1

Mobile-first statistical roulette simulation lab. This repository is entirely separate from the BLACK ROYAL sports project.

## Included

- European and American physical wheel orders
- Touch racetrack, up to three centers, ±0–4 neighbors
- Duplicate-free coverage calculation and mathematical coverage percentage
- Separate local histories for each roulette type
- Validated JSON import, manual result entry, frozen round snapshots
- Win/loss and basic simulation statistics
- Clearly labeled demo ranking (not the real BR Engine)

## Local preview

Open `index.html`, or run any static server in this directory.

## Import contract

```json
{
  "roulette": "american",
  "results": ["13", "34", "00", "24"]
}
```

The importer rejects invalid values and never fills missing outcomes. It preserves the supplied order. Phase 1 stores data only in the browser (`localStorage`).

## Netlify

Set this folder as the repository root. No build command is required; publish directory is `.`.

## Scientific boundary

The current ranking is a deterministic UI demonstration based on simple recent frequency and wheel proximity. It is not the documented BR Engine, a calibrated probability, or a guarantee. The production engine belongs to Phase 2; walk-forward and random baseline belong to Phase 3.
