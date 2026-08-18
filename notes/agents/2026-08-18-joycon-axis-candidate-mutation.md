# JoyCon axis-candidate mutation slice

- Unexpected hurdle: the broader axis-candidate scan left one survivor at the exact movement-delta threshold.
- Diagnosis path: a bounded scan over `joyConMapper.js:1154-1197` found the strict delta comparison as the only survivor; the direction and candidate branches were already covered.
- Chosen fix: added exact positive and negative delta-boundary assertions, proving equality is not sufficient for capture.
- Evidence: the final bounded Stryker run over `1154-1157` killed all 6/6 mutants; focused Jest passed 43 tests; targeted ESLint and diff checks passed.
- Next-time guidance: isolate arithmetic threshold helpers from larger candidate scans and test both signed equality boundaries.
