# jscpd clone buckets

## Checklist

- [x] `NEON-MIRROR` - common normalization and fallback helpers
- [ ] `BLACKWIRE` - core request, lifecycle, and environment helpers
- [ ] `RED-GATE` - POST-gated cloud handlers
- [ ] `PIXEL-EDGE` - tiny board / getter-style browser toy helpers
- [ ] `GHOST-PRINT` - content generation / copy pipeline helpers
- [ ] `STATIC-CHROME` - CSV / build utility helpers
- [ ] `VANTA-HIDE` - moderation display helpers
- [ ] `SINGULARITY-FLEET` - `battleshipSolitaireFleet.js`
- [ ] `SINGULARITY-DATA` - `data.js`
- [ ] `SINGULARITY-LOCAL` - `localStorageLens.js`
- [ ] `SINGULARITY-TAGS` - `tags.js`
- [ ] `SINGULARITY-STATS` - `generate-stats-core.js`
- [ ] `SINGULARITY-DIRTY` - `mark-variant-dirty-core.js`
- [ ] `SINGULARITY-GAMEPAD` - `gamepadCapture.js`
- [ ] `SINGULARITY-COMMON` - `commonCore.js`
- [ ] `SINGULARITY-SYMPHONY` - `symphony.js`

## Notes

- The `NEON-MIRROR` bucket was the first coherent slice and was resolved by reusing existing common helpers instead of keeping local string and number normalization wrappers.
- The remaining buckets are broader and should be split further before attempting more refactors.
