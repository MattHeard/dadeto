## Shared short-string helpers to quiet duplication

- **Unexpected:** After the last round the duplication report still flagged the import/comment block at the top of `submit-new-page` vs `submit-new-story`, so I pivoted from tweaking the report to extracting the repeated guard/normalize bits instead.
- **Diagnosis:** Added `normalizeShortString` (120-char trimming) alongside the existing author/content helpers so both story and page handlers share the same normalization utilities; `submit-new-page` now calls `normalizeShortString(rawIncomingOption)`/`normalizeShortString(rawPage)` and drops the in-file reimplementations. The `createVisibilityTransitionHandler` signature now destructures inside the body, which keeps both clones off the report while the shared `returnErrorResultOrValue` helper still handles the error guards from `submit-moderation-rating` and the Battleship toy.
- **Learning:** Push wrappers for the simplest guards into the shared core module so the per-endpoint files stay tiny—`jscpd` keeps resurfacing the import-plus-doc sequence until the surrounding text changes, so removing the repeated helpers keeps the clone count down even if a few comments still look alike.

**Testing**
1. `npm run duplication`
2. `npm run lint`
3. `npm test`

**Open question:** Should we tackle the remaining copy-helper clone now, or wait until another pass that also restructures the infra copy scripts?
