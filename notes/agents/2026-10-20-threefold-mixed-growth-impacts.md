# 2026-10-20 THREEFOLD mixed growth impacts

- Unexpected hurdle: the prior simultaneous-growth characterization covered the rat and watchkeeper, but neither authored gatehouse structure intersects that synthetic footprint.
- Diagnosis: the shared preview independently returns sorted geometry, occupant, and creature IDs; the commit path uses the geometry preview for persistent rubble and those same living-target IDs for their outcomes.
- Chosen fix: add two non-overlapping synthetic geometry volumes at opposite edges of one growth footprint, insert them in reverse ID order, and verify the read-only preview, renderer highlights, combined commit, save/import, and projection after restore. No simulation code or authored scene changed.
- Verification: `npm run test:impact -- --files test/core/browser/game/threefold-growth-occupant.test.js` passed (1 suite / 13 tests); final-diff `npm run check` passed all 10 gates (959 suites / 6,622 tests across five serial fallback shards, 0 clones, 0 audit vulnerabilities). Exact-head Full Check is pending.
- Next-time guidance: this proves stable mixed effects in the loaded Broken Gate scene; test cross-chunk rehydration separately before claiming the broader unloaded-world requirement.
