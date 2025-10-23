# setupAssignModerationJobRoute argument refactor

## Challenges
- Updating the route factory to accept raw helpers meant touching both the Cloud Function entry point and the core handler tests; missing any call site would break the integration.

## Resolutions
- Searched for every invocation of `setupAssignModerationJobRoute` and adjusted each to pass the `createRunVariantQuery` factory and `now` helper explicitly, then reran the Jest suite to confirm the refactor was safe.
