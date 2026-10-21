# THREEFOLD Crownback Reach encounter

## Unexpected hurdle

- The first focused pass found the Crownback route missing from the shared high-world state guard and a clone in repeated scene records. After those fixes, `npm run check` first failed its JSDoc pass on untyped saved encounter state and the renderer's guarded call. A later documentation path triggered the documented all-unit fallback in the impact selector.

## Diagnosis and fix

The state guard now recognizes Crownback Reach, and its saved encounter field is normalized through a dedicated route helper. The renderer narrows the guarded route state before checking interaction range. Shared high-world scene constructors keep authored coordinates readable and avoid duplicated setup. The route reuses the existing high-world reducer, Mosslight renderer, preview/commit flow, action clock, and route-specific save machinery.

Crownback Reach starts at +3 (49.38 m) with elder Tharn at 44 m and a calf at 18 m. Moving within the authored conversation radius enables an E meeting once; repeated or out-of-range interactions do nothing. The +4 growth preview identifies the affected arch, floodwall, and Crownbacks. Regression tests cover grid alignment, interaction, growth effects, and isolated save/export/import.

## Evidence

- `npm run check:impact:run -- --files src/core/browser/game/threefold/high-world-scenes.js src/core/browser/game/threefold/crownback-reach.js src/core/browser/game/threefold/simulation.js src/core/browser/game/threefold/page.js src/core/browser/game/threefold/save.js src/core/browser/game/threefold/renderer.js test/core/browser/game/threefold-crownback-reach.test.js test/core/browser/game/threefold-crownback-page.test.js test/core/browser/game/threefold-page.test.js` passed: 17 suites / 212 tests, 100% changed-core statement and branch coverage, zero clones.
- `npm run build` passed.
- `npm run manuals:check` passed; 79 toy manuals validated.
- `npm run check -- --skip-tests` passed all 10 static gates.
- `npm run check` passed all 10 fast gates and 975 suites / 6,813 tests across five all-unit shards. The selector used its safe all-unit fallback because the edited set included `docs/toys/threefold/acceptance.md`; zero clones and zero audit vulnerabilities.
- Exact-head GitHub Full Check and Terraform Validate are pending push.

## Next-time guidance

- Extend an authored high-world route by adding its typed state and predicate before integrating it into the page, renderer, reducer, and save codec; the focused impact evaluator catches missing shared guards and changed-core coverage gaps.
- Keep documentation paths out of the change-selector file list; use the repository's explicit documentation-only static check when validating docs separately, and record when `npm run check` falls back to all unit tests.
- Continue with the next unfinished Rank 3 acceptance item while exact-head CI runs, then return to record its result before closing the owning Bead.
