# Mosslight tile generator arity cleanup

- Unexpected hurdle: the full check exposed seven Commons rendering failures because Commons injects a one-record tile renderer through the shared Mosslight renderer boundary.
- Diagnosis: tile generation had mixed coordinate, terrain appearance, and per-tile features. Splitting those into three arguments exposed that the injected renderer was a compatibility boundary, not a Mosslight-only implementation detail.
- Fix: `generateBackgroundTile` and the Mosslight renderer callback now receive coordinate, surface, and features records. The Commons renderer adapts those records into its existing tile input, preserving walkway behavior.
- Evidence: targeted no-cache arity lint is empty in `.tmp/mosslight-tile-arity-after.json`; focused Mosslight and Commons tests passed (3 suites, 24 tests); `npm run tsdoc:check` passed; elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates, 0 failures, 0 clones, and 0 audit vulnerabilities. Fresh global inventory `.tmp/parameter-bag-global-after-mosslight-tile.json` reports 38 findings across 38 files (down from 39/39).
- Next time: inspect shared renderer injection call sites whenever a renderer callback signature changes. Next target is `src/core/browser/game/the-commons-of-tomorrow/renderer.js:413`.
