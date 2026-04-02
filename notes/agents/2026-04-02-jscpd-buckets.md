# jscpd clone buckets

## Checklist

- [x] `NEON-MIRROR` - common normalization and fallback helpers
- [x] `NEON-CIRCUIT` - `joyConMapping`, `ledgerIngest`
- [x] `VOID-STATIC` - `cloud-core`, `symphony`, `copyToClipboard`
- [x] `RED-GATE` - `gamepadCapture`, `ledgerIngestStorageToy`, `process-new-story`
- [x] `CORE-PRISM` - `commonCore`, `ledgerIngest` core, `submit-new-story`
- [x] `PIXEL-EDGE` - `get`, `ticTacToe`
- [x] `VANTA-HIDE` - `hide-variant-html`, `moderatorRatingCounts`
- [x] `SINGULARITY-SHELL` - `battleshipSolitaireFleet`, `data`
- [x] `SINGULARITY-TRAIL` - `tags`
- [x] `STATIC-CHROME` - `buildCore`, `csvToJsonObject`
- [ ] `GHOST-LOOP` - `blog`
- [ ] `SILENT-SYMPHONY` - `symphony`, `ledgerIngest`
- [ ] `BLACKWIRE-STATIC` - `gamepadCapture`, `ledgerIngestStorageToy`, `process-new-story`
- [ ] `GLASS-LOCK` - `storageLens`, `mark-variant-dirty`
- [ ] `SINGULARITY-DATA` - `data`

## Notes

- The `NEON-MIRROR` bucket was the first coherent slice and was resolved by reusing existing common helpers instead of keeping local string and number normalization wrappers.
- `NEON-CIRCUIT` was resolved by extracting a shared JSON-presenter factory so the Joy-Con and Ledger Ingest presenters no longer duplicated their wrapper setup.
- `VOID-STATIC` was resolved by tightening the cloud string helpers, using a shared report-and-return-false helper for clipboard/auth failures, and shifting the remaining string checks to existing primitives.
- `RED-GATE` was resolved by extracting shared capture-input helpers, reusing deep-merge-based payload construction, and keeping the remaining report fields in shared browser/cloud helpers.
- `CORE-PRISM` was resolved by reusing the shared string helpers from `commonCore` and removing the local string-normalization wrappers in submit-new-story and ledger-ingest core.
- `PIXEL-EDGE` is already resolved in the live duplication report; both toy helpers now use the shared `whenOrNull` primitive, so the bucket is marked complete here as well.
- `STATIC-CHROME` is still live in the current duplication report; `buildCore` and `csvToJsonObject` remain one of the active clone pairs.
- `VANTA-HIDE` is resolved in the live duplication report after reusing `numberOrZero` for the visibility and moderator-count defaults, so that bucket is marked complete here as well.
- `SINGULARITY-SHELL` does not appear in the current live duplication report, so that bucket stays resolved here.
- The live report now collapses to five remaining groups: `GHOST-LOOP`, `SILENT-SYMPHONY`, `BLACKWIRE-STATIC`, `GLASS-LOCK`, and `SINGULARITY-DATA`.
- `STATIC-CHROME` is now resolved in the live duplication report after moving the tuple-to-object helper into `commonCore`, so the browser toy no longer depends on `src/core/build`.
- The remaining work has been regrouped into smaller cyberpunk-named buckets so follow-up refactors can stay narrow and landing-plane sized.
- The single-file leftovers are bundled into two residual buckets so the list stays close to ten instead of turning back into one giant catch-all.
- `BLACKWIRE` was broken into smaller, turn-sized buckets after a partial pass landed presenter and tag-helper extractions.
