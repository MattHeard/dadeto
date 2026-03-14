## Trial

- directory: `src/core/cloud/submit-new-page`
- bead: `dadeto-zpi1`
- trial focus: decide whether the option/page lookup helpers belong in `submit-new-page-core.js` (the directory-named shared module) or stay isolated in `helpers.js`, then document the experiment using the standard rubric.

## Rubric

- shared/helper placement decision: lifted `parseIncomingOption`, `findExistingOption`, `findExistingPage`, and their supporting guard helpers into `submit-new-page-core.js` so the shared core now owns the canonical validation and lookup paths while the old `helpers.js` file becomes a thin re-export for backwards compatibility.
- where the agent looked first for shared logic: inspected `submit-new-page-core.js` for the canonical HTTP handler flow, then confirmed the helper exports were still reachable via `helpers.js` before removing the duplicated implementation.
- obvious vs exploration: required a short inspection of both files to understand that the helpers could live with the handler logic without creating cyclic dependencies; the directory-shared-core default made the next step obvious once the shared core already orchestrated the target resolution.
- helper-file sprawl effect: positive; one fewer implementation file and the helpers are now collocated with the handler plumbing, improving predictability for future agents.
- shared-module coherence: `submit-new-page-core.js` remains focused on submission validation and persistence while now also owning the low-level parsing/lookup helpers that only make sense inside this directory's workflow.
- directory-splitting pressure: low; there still only two files in the directory, so the experiment kept the shared core as the first stop without forcing an aggressive split.
- import predictability: improved because future agents can look straight in `submit-new-page-core.js` for the option/page helpers instead of tracking down `helpers.js` and re-exports.

## Conclusion

The third trial reinforced that helper families tightly coupled to a directory's handler workflow belong inside the directory-named shared module, not a separate concept file. Unlike the first trial (keep capture-form helpers separate) and the second trial (move DOM helpers into the presenters core), this trial showed the shared core can absorb the parsing/lookup helpers without diluting its focus; the helper file now just re-exports them so existing call sites stay stable. npm test (node --experimental-vm-modules ./node_modules/.bin/jest --coverage --watchman=false && node src/scripts/write-coverage-summary.js) verifies the refactor and coverage baseline.

## Runner note

- unexpected hurdle: the `helpers.js` file contained the only exports, so moving the logic into the shared core risked breaking every dependent module unless the re-export layer stayed intact.
- diagnosis path: inspected `src/core/cloud/submit-new-page/helpers.js`, the core handler, and the public re-export to understand who depended on each helper.
- chosen fix: added the missing Firestore query imports to `submit-new-page-core.js`, moved the parsing/lookup helpers (with their typedefs) into the shared core, and turned the old `helpers.js` into a simple re-export so nothing outside the directory had to change.
- next-time guidance: when absorbing helpers into a directory core, keep the thin re-export layer so caller imports remain stable and the experiment writes a short note for future agents describing the new default.
