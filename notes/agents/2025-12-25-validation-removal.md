# Validation helper removal

- Unexpected: deleting `src/core/validation.js` required updating the boolean-coercer toy and the re-export tests at the same time; the dependency graph still referenced `validation.js` through the `2025-07-05` toy re-export and the `booleanCoercer` import, so I introduced a tiny local `isType` helper and dropped the ad-hoc re-export.
- Learned: even helper modules that only feed tests or widgets can have numerous indirect references; once the module was removed the Jest suites failed during import resolution, so the fix needed both the test rearrangement and the toy helper cleanup.
- Next step: regenerate `public/` artifacts if we want the browser/tv bundles to stop referencing the deleted module (right now the copy output still contains `validation.js`).
