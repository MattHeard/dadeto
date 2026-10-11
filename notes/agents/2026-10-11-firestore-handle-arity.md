# Firestore trigger handle arity cleanup

- Unexpected hurdle: removing parameter destructuring exposed formatting that needed to match the repository's Prettier layout; the full check was stopped before accepting an intermediate warning.
- Diagnosis: the six-field trigger record was the only arity finding. The function registry, Firestore getter, handler factory, path, event name, and region are all read from one named record.
- Fix: use direct record reads and explicit `undefined` checks for event and region defaults, preserving prior behavior even for invalid null values. No trigger registration or callback behavior changed.
- Evidence: focused Firestore handle tests passed (1 suite / 2 tests); warning-free targeted arity scan and TSDoc passed. Elevated `npm run check` passed all 10 gates. Coverage: lines 23557/23557, statements 24706/24706, functions 7927/7927, branches 13273/13273 (100%). Local E2E passed 11/11, duplication found 0 clones, npm audit found 0 vulnerabilities. Cloud-only inventory fell to 12 findings in 12 files in `/tmp/parameter-bag-cloud-after-firestore-handle.json`.
- Next time: confirm formatting with the target scan before starting the long full-check run; the next findings are in `generate-stats-core.js` and the credit core.
