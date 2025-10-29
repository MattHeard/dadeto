# Lint warning cleanup

## Challenges
- Running `npm run lint` auto-applied fixes across many core cloud modules, obscuring the single warning I intended to address.

## Resolutions
- Reverted the incidental lint fixes, then replaced the ternary operators in `buildVariantPath` with explicit assignments to clear one warning without broad changes.
