# Real Hourly Wage

## Outcome

Added a new browser toy that calculates real hourly wage from normalized period and overhead inputs.

## Notes

- Kept the core calculation pure and breakdown-friendly.
- Used the shared browser toy JSON parser for the UI-facing wrapper.
- Flattened validation helpers until `npm run lint` and `npm run duplication` were both clean.
- Regenerated `public/` via the build script; no direct public edits were kept.

## Verification

- `npm run check`
- `npm run build`
- `git status` was clean apart from the intended generated files before commit
