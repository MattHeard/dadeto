# PR #2740 Mainline Reconciliation

PR #2740 was based on the main commit before PR #2739. Merging the current main produced conflicts in the THREEFOLD game, tests, docs, and reuse-event ledger. The PR version contains the reviewed full episode state and builds on the main-side rat encounter, so the game files and docs retain the PR version. The reuse-event ledger keeps both sides' unique entries.

Auto-merged tests still expected the older schema-v2 save and exact toast text. Updated those expectations to the current schema-v5 and appended action hint. Split the long renderer test group at the episode-outcome boundary to keep ESLint's function-length rule satisfied.

Evidence: the focused THREEFOLD tests passed (18 suites, 281 tests); `npm run build` passed; `npm run check` passed with five all-unit shards (968 suites, 6,763 tests) and all ten static gates. After pushing, require PR #2740 to report current-base mergeability and an exact-head Full Check pass before integration.
