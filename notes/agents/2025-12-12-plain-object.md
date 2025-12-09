# Plain Object Helper

- `isPlainObject` was duplicated in the `2025-12-05` toy files (edge weights, Dijkstra search, visibility calculations); moving it into `src/core/objectUtils.js` keeps the shared logic centralized so updates propagate without touching each toy file.
- Updated the affected toys to import the shared helper instead of defining their own functions; the duplication report at `minTokens=35` now no longer flags that block, leaving only the remaining clones longer than 35 tokens.
- No behavior changes were needed because the helper is identical to the previous inline versions, but the duplication fix required touching multiple files and rerunning lint/tests/duplication.

Testing:
- `npm run lint`
- `npm test`
- `npm run duplication`
