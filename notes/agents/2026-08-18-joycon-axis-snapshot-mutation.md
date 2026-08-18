# JoyCon axis-snapshot mutation slice

- Unexpected hurdle: the initial scan found three survivors because only both-null and both-present cases were covered.
- Diagnosis path: a bounded scan over `joyConMapper.js:1122-1142` isolated the mixed null/present truth-table gaps in `hasAxisSnapshots`.
- Chosen fix: added assertions for each mixed missing-snapshot combination.
- Evidence: the final bounded Stryker run over `1122-1124` killed all 8/8 mutants; focused Jest passed 42 tests; targeted ESLint and diff checks passed.
- Next-time guidance: boolean snapshot guards require both mixed cases in addition to both-null and both-present cases.
