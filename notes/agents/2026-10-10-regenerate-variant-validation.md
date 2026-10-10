# Regenerate variant dependency validation

- Unexpected hurdle: `validateRegenerateVariantDeps` unpacked seven dependency properties in one validator, combining auth, form/UI, and request/effect boundary checks.
- Diagnosis: the function was only coordinating dependency validation; the individual checks already had distinct responsibility groups and stable failure messages.
- Chosen fix: keep the existing public options object and split its validation into auth, form, and request/effect helpers. Call them in the original order so the same first invalid dependency still determines the error.
- Evidence: focused Jest passed (3 suites, 190 tests); `npm run lint`, `npm run tsdoc:check`, and elevated `npm run check` passed (10/10 gates, 11/11 local E2E, zero clones). The targeted arity scan for `admin-core.js` now reports 5 findings, down from 6.
- Next-time guidance: extract validation by collaborator responsibility while preserving call order; avoid re-packing the fields into new nested objects. Continue with the next reported `admin-core.js` finding and keep global enforcement disabled until the baseline is cleared.
