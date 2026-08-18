# JoyCon button-selection mutation slice

- Unexpected hurdle: the initial selection scan left survivors in null handling, strict comparison, and equal-value tie behavior.
- Diagnosis path: a bounded scan over `joyConMapper.js:1030-1079` reported eight survivors across the selector and comparator helpers.
- Chosen fix: added direct assertions for null candidate/best, stronger and weaker candidates, strict comparison, and stable equal-value ties.
- Evidence: the final bounded Stryker run killed all 18/18 mutants; focused Jest passed 40 tests; targeted ESLint and diff checks passed.
- Next-time guidance: explicitly test selector identity and tie behavior when helper functions return one of their input objects.
