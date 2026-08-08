# Generate stats core coverage

- Unexpected hurdle: the stale inventory omitted two CDN invalidation error branches and the non-empty nested-page traversal path.
- Diagnosis: focused ESM coverage identified metadata-token failure handling, mapped invalidation failure handling, and story/page counting as the missing paths.
- Fix: added genuine tests for those failures and the nested Firestore shape, including restoration of the injected UUID dependency after the failure case.
- Next time: exercise both empty and non-empty collection traversal paths when testing count fallbacks.
