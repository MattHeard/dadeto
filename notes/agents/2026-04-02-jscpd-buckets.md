# jscpd clone buckets

## Checklist

- [x] `NEON-MIRROR` - common normalization and fallback helpers
- [x] `NEON-CIRCUIT` - `joyConMapping`, `ledgerIngest`
- [x] `VOID-STATIC` - `cloud-core`, `symphony`, `copyToClipboard`
- [x] `RED-GATE` - `gamepadCapture`, `ledgerIngestStorageToy`, `process-new-story`
- [x] `CORE-PRISM` - `commonCore`, `ledgerIngest` core, `submit-new-story`
- [ ] `GHOST-PRINT` - `blog`, `copy`, `generate-stats`
- [x] `PIXEL-EDGE` - `get`, `ticTacToe`
- [x] `STATIC-CHROME` - `buildCore`, `csvToJsonObject`
- [ ] `VANTA-HIDE` - `hide-variant-html`, `moderatorRatingCounts`
- [ ] `SINGULARITY-SHELL` - `battleshipSolitaireFleet`, `data`
- [ ] `SINGULARITY-TRAIL` - `tags`
- [ ] `BLACKWIRE-ARC` - `cloud-core`, `copy`, `generate-stats`
- [ ] `BLACKWIRE-STATIC` - `gamepadCapture`, `data`, `battleshipSolitaireFleet`

## Notes

- The `NEON-MIRROR` bucket was the first coherent slice and was resolved by reusing existing common helpers instead of keeping local string and number normalization wrappers.
- `NEON-CIRCUIT` was resolved by extracting a shared JSON-presenter factory so the Joy-Con and Ledger Ingest presenters no longer duplicated their wrapper setup.
- `VOID-STATIC` was resolved by tightening the cloud string helpers, using a shared report-and-return-false helper for clipboard/auth failures, and shifting the remaining string checks to existing primitives.
- `RED-GATE` was resolved by extracting shared capture-input helpers, reusing deep-merge-based payload construction, and keeping the remaining report fields in shared browser/cloud helpers.
- `CORE-PRISM` was resolved by reusing the shared string helpers from `commonCore` and removing the local string-normalization wrappers in submit-new-story and ledger-ingest core.
- `PIXEL-EDGE` is already resolved in the live duplication report; both toy helpers now use the shared `whenOrNull` primitive, so the bucket is marked complete here as well.
- `STATIC-CHROME` is also resolved in the live duplication report; the current report still shows `buildCore` and `csvToJsonObject` as the paired areas in the checklist, but that pair no longer appears as an active clone, so the bucket is marked complete here too.
- The remaining work has been regrouped into smaller cyberpunk-named buckets so follow-up refactors can stay narrow and landing-plane sized.
- The single-file leftovers are bundled into two residual buckets so the list stays close to ten instead of turning back into one giant catch-all.
- `BLACKWIRE` was broken into smaller, turn-sized buckets after a partial pass landed presenter and tag-helper extractions.
