# Remove button handler boundary

- Unexpected hurdle: The first full check caught two unused fixture variables after tests stopped constructing remove callbacks inside the setup helper.
- Diagnosis: Listener lifecycle tests no longer needed row state or render spies; only the focused behavior tests still need the real row callback.
- Fix: Pass `createOnRemove` from the focused setup behavior tests and a simple callback from listener-only tests; remove obsolete fixture variables.
- Next time: Separate behavioral callback tests from registration/disposal tests when moving stateful callback construction to the owning composition layer.
- Evidence: Focused Jest passed 9 suites / 39 tests. `npm run lint` passed. Fresh no-cache arity scan removed setupRemoveButton and reduced toys.js from 8 to 7 findings. `npm run check` passed all 10 gates, including full coverage shards and 11/11 local E2E. Log: `.tmp/npm-check-setup-remove-button.log`.
