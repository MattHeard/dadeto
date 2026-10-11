# Moderator ratings parameter arity loop

- **Unexpected hurdle:** The first split left `dom` and `cleanupFns` unused in `buildRowFieldInputs`; those dependencies were still being copied into each returned field descriptor.
- **Diagnosis:** `buildFieldInput` needs one field description (placeholder, initial value, change callback), DOM operations, and a cleanup owner. DOM and cleanup are row-level resources and do not belong in each individual field descriptor.
- **Fix:** Kept descriptors focused on field data and callback, passed `dom` and the row cleanup list separately, and updated the direct helper test to verify the descriptor no longer carries those resources.
- **Evidence:** `test/inputHandlers/moderatorRatingsHandler.test.js` passed (11 tests); scoped no-cache parameter-bag lint and TSDoc passed. `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates with zero clones and zero audit vulnerabilities. Fresh no-cache global inventory `.tmp/parameter-bag-global-after-moderator-ratings.json` reports 29 findings across 29 files.
- **Next time:** At `sharedSpecialInput.js:50`, separate placement context (`container`, `textInput`, `dom`) from the optional existing element and creation callback, keeping each dependency visible and avoiding another unpacked object.
