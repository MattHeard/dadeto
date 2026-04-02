# jscpd clone buckets

## Checklist

- [x] `NEON-MIRROR` - common normalization and fallback helpers
- [ ] `NEON-CIRCUIT` - `browser-core`, `copyToClipboard`, `joyConMapping`, `ledgerIngest`
- [ ] `VOID-STATIC` - `cloud-core`, `mark-variant-dirty`, `symphony`, `storageLens`
- [ ] `RED-GATE` - `gamepadCapture`, `ledgerIngestStorageToy`, `process-new-story`
- [ ] `CORE-PRISM` - `commonCore`, `ledgerIngest` core, `submit-new-story`
- [ ] `GHOST-PRINT` - `blog`, `copy`, `generate-stats`
- [ ] `PIXEL-EDGE` - `get`, `ticTacToe`
- [ ] `STATIC-CHROME` - `buildCore`, `csvToJsonObject`
- [ ] `VANTA-HIDE` - `hide-variant-html`, `moderatorRatingCounts`
- [ ] `SINGULARITY-SHELL` - `battleshipSolitaireFleet`, `data`
- [ ] `SINGULARITY-TRAIL` - `localStorageLens`, `tags`
- [ ] `BLACKWIRE-ARC` - `cloud-core`, `copy`, `generate-stats`
- [ ] `BLACKWIRE-FLOOD` - `browser/storageLens`, `mark-variant-dirty`, `browser-core`
- [ ] `BLACKWIRE-STATIC` - `gamepadCapture`, `localStorageLens`, `data`, `battleshipSolitaireFleet`

## Notes

- The `NEON-MIRROR` bucket was the first coherent slice and was resolved by reusing existing common helpers instead of keeping local string and number normalization wrappers.
- The remaining work has been regrouped into smaller cyberpunk-named buckets so follow-up refactors can stay narrow and landing-plane sized.
- The single-file leftovers are bundled into two residual buckets so the list stays close to ten instead of turning back into one giant catch-all.
- `BLACKWIRE` was broken into smaller, turn-sized buckets after a partial pass landed presenter and tag-helper extractions.
