# JoyCon snapshot-guard mutation slice

- Unexpected hurdle: the initial button-capture scan left one survivor because the standalone guard lacked a fully-present false-case assertion.
- Diagnosis path: a bounded scan over `joyConMapper.js:927-945` reported one survivor in `isMissingButtonSnapshots`.
- Chosen fix: added the complete truth-table cases for previous/current snapshots, including each missing side and both present.
- Evidence: the final bounded Stryker run over `943-945` killed all 6/6 mutants; focused Jest passed 37 tests; targeted ESLint and diff checks passed.
- Next-time guidance: test both positive and negative outcomes for boolean guard helpers, even when a caller already covers one side.
