# BLACKWIRE Partial Pass

## Hurdle
The remaining BLACKWIRE clone frontier at `jscpd minTokens = 15` was too broad to clear in one narrow helper extraction loop.

## Diagnosis
Two of the easiest overlaps were real semantic helpers:
- the tag click handlers in `src/core/browser/tags.js`
- the submit-new-story UID normalization path in `src/core/cloud/submit-new-story/submit-new-story-core.js`

The rest of BLACKWIRE still consists mostly of:
- gamepad lifecycle and payload reuse
- cloud-core / symphony string-normalization tails
- copy / generate-stats directory-copy wrappers
- browser presenter and storage-lens token windows
- a handful of self-clones

## Fix
I extracted the shared tag click handler and switched submit-new-story to `ensureString(...)` instead of a local `whenString(..., value => value)` guard.

## Next Time
Pick one of the remaining high-signal clusters, probably:
- `gamepadCapture`
- `cloud-core` / `symphony`
- `browser/storageLens` / `mark-variant-dirty`

Those are more likely to yield durable refactors than the low-token self-clones.
