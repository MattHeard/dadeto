# Variant visibility parameter-bag arity

- Unexpected hurdle: the first full test phase ended at 99.992% branch coverage after the effect adapter added a fail-closed validation branch.
- Diagnosis: the fresh global arity report showed five transport-only destructuring findings in the same core module. The coverage artifact identified the only missed branch at `updateFirestoreDocument` validation.
- Chosen fix: replaced anonymous destructuring bags with named workflow input records and direct field access, preserving explicit AllowEffects forwarding. Added a factory test for a missing Firestore update adapter.
- Evidence: focused Jest passed (2 suites, 43 tests); fresh per-file no-cache arity scan reported 0; TSDoc passed; `npm run check` passed the test group and all 10 gates (`.tmp/npm-check-parameter-bag-update-variant-visibility-rerun.log`), with 100% statements, branches, functions, and lines, 11/11 local E2E tests, 0 clones, and 0 vulnerabilities.
- Next-time guidance: new effect-boundary validation branches need a direct failure-path test to preserve the repository's 100% branch-coverage contract. The last global inventory had 103 findings across 80 files; removing these five leaves a projected 98. The next largest listed cluster is `src/core/cloud/render-variant/render-variant-core.js` with four findings.
