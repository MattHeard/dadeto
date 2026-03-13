## Trial

- directory: `src/core/cloud`
- bead: `dadeto-wx1c`
- trial focus: decide whether the shared Firestore query builders should live in `cloud-core.js` (the directory-named shared module) and leave `firestore-helpers.js` as a compat shim instead of keeping the helper files separate.

## Rubric

- shared/helper placement decision: moved `buildPageByNumberQuery` and `buildVariantByNameQuery` into `cloud-core.js` so the directory-named shared module becomes the canonical home for basic Firestore queries, and turned `firestore-helpers.js` into a thin re-export for existing import paths.
- where the agent looked first for shared logic: inspected `cloud-core.js`'s Firestore helpers to confirm it already contained related helpers (snapshot/bookkeeping utilities) and that the new functions could live there without changing dependencies.
- obvious vs exploration: mostly obvious once I saw that `cloud-core` already orchestrates Firestore utilities and the two callers just needed those builders; the main investigation was ensuring the re-export kept existing call sites happy.
- helper-file sprawl effect: positive; one fewer helper file with duplicated logic, and helper consumers now reach for `cloud-core.js` before falling back to the compatibility shim.
- shared-module coherence: `cloud-core.js` already covers cross-function Firestore affordances, so absorbing the query builders keeps the shared core consistently the first stop for cloud helpers.
- directory-splitting pressure: low; no new directories or concepts were introduced, so the consolidation keeps the existing three-file structure intact.
- import predictability: improved because `mark-variant-dirty` and `submit-new-page` now import the builders directly from `cloud-core.js`, and the `firestore-helpers.js` shim now just re-exports them for any stray consumers.

## Conclusion

This fourth trial shows that the default shared core should own the low-level Firestore query builders instead of delegating to a dedicated helper file, which contrasts with trial one (kept capture-form helpers separate) and aligns with trials two and three (moving DOM and parsing helpers into their shared cores). Running `npm test` (`node --experimental-vm-modules ./node_modules/.bin/jest --coverage --watchman=false && node src/scripts/write-coverage-summary.js`) failed because Jest could not open `/home/matt/dadeto/src/core/browser/jsonValueHelpers.js`, causing sixteen browser tests to abort; the failure appears unrelated to this migration but is the terminal state after the required command.

## Runner note

- unexpected hurdle: the `public` copies of the cloud modules duplicated the old helper imports, so I had to update both the source and the built artifacts before the trial felt complete.
- diagnosis path: read `public/core/cloud/cloud-core.js`, `public/core/cloud/mark-variant-dirty/mark-variant-dirty-core.js`, and `public/core/cloud/submit-new-page/helpers.js` to confirm they still imported the shared helpers from the legacy shim.
- chosen fix: moved the query builders into `cloud-core.js`, updated the consumer imports to use that shared module, and left `firestore-helpers.js` as a re-export so backward-compatible paths still resolve.
- next-time guidance: when migrating helper families, update both the source and the `public`/infra copies together and double-check any `copy-cloud` rewrites so runtime glue keeps pointing at the directory-named shared core.
