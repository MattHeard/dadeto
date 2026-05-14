# Core-First Check Gates

## Unexpected Hurdle

The repository already had strong `src/core` coverage from tests and duplication checks, but `npm run lint` treated warnings as non-fatal and masked ESLint's exit code by chaining with `; cat`.

## Diagnosis Path

The core-first architecture goal needs two pressures at once: strict rules inside `src/core`, and a ratchet that prevents new bulky non-core files while existing non-core logic is migrated gradually.

## Chosen Fix

Updated `npm run lint` to use `--max-warnings=0` and preserve the ESLint exit code with `&&`. Added `npm run non-core-thin`, which fails non-core JavaScript files over 50 lines unless listed in `non-core-thin-exemptions.json`. Added today's baseline exemptions for the 53 current non-core files over that limit.

## Evidence

- `npm run non-core-thin`: checked 211 non-core JS files, 53 baseline exemptions, max 50 lines.
- `npm run lint`: passed with zero warnings.
- `npm run check`: passed end to end with Jest, strict lint, Dependency Cruiser, JSCPD, non-core thinness, and audit all green.

## Next-Time Guidance

Treat `non-core-thin-exemptions.json` as the migration backlog. When moving logic into `src/core`, remove the matching exemption in the same change so the baseline shrinks monotonically.
