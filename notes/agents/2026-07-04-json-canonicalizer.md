# Agent retrospective: JSON canonicalizer toy

- Unexpected hurdle: the repo-wide `npm run check` failed on an existing lint warning in `src/core/browser/admin-core.js`, which was unrelated to the new toy slice.
- Diagnosis path: I ran the targeted toy Jest file first, then the full check gate; the only new issue surfaced by the toy work itself was a `tsdoc:check` complaint about an unsafe `constructor` access in the new plain-object guard.
- Chosen fix: made parse failures deterministic, switched the object guard to `Object.prototype.toString.call(value) === '[object Object]'`, and kept the toy pure JSON-in/JSON-out with recursive key sorting.
- Next-time guidance: when adding a new toy, verify the touched files with a targeted lint/test command first, then treat any repo-wide lint warning outside the slice as baseline debt unless the report names one of the new files.
