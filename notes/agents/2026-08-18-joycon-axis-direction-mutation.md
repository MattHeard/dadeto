# JoyCon axis-direction mutation slice

- Unexpected hurdle: the first boundary assertions did not distinguish a positive value from the negative-direction threshold and left two survivors.
- Diagnosis path: a bounded scan over `joyConMapper.js:1090-1096` reported three strictness survivors in the positive/negative threshold comparisons.
- Chosen fix: added exact positive and negative threshold assertions plus an opposite-direction rejection case.
- Evidence: the final bounded Stryker run killed all 15/15 mutants; focused Jest passed 41 tests; targeted ESLint and diff checks passed.
- Next-time guidance: for signed thresholds, test both exact equality and a same-magnitude value on the wrong side of zero.
