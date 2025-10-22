# Add Dendrite Page import fix

## Challenges
- The addDendritePage toy loads modules from `/toys/...` at runtime, so relative `../../` imports resolve to the site root. That meant new re-export stubs still needed the real utilities in `public/`.
- Updating the copy workflow required threading new paths through the directory configuration and amending Jest expectations that assert copy behavior.

## Resolutions
- Added per-toy re-export modules so the toy imports local siblings, keeping the toy folder self-contained.
- Extended `createCopyDirectories` and `copyRootUtilityFiles` to mirror the shared utilities into `public/`, updating unit tests to cover the new behavior.
