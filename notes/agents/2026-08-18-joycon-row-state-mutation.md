# JoyCon row-state mutation slice

- Unexpected hurdle: the initial row-state scan left one survivor in the skipped-control branch.
- Diagnosis path: a bounded scan over `joyConMapper.js:1369-1393` showed active and done states were covered, but skipped state was not.
- Chosen fix: added a direct skipped-row assertion through `getRowState`.
- Evidence: the final bounded Stryker run over `1369-1375` killed all 5/5 mutants; focused Jest passed 47 tests; targeted ESLint and diff checks passed.
- Next-time guidance: cover every enum/state branch explicitly when composing row-state helpers.
