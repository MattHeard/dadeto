# Complexity helper for token parsing

- I expected the lint output to narrow down on a single src/core warning, but the repo still reports numerous complexity findings across many modules; I focused on the closest manageable item and left the rejects untouched while noting them for future follow-up.
- Extracting the bearer-token match into `extractBearerToken` let `parseAuthorizationHeader` keep only the type check, satisfying the request to split conditional logic without touching wider shared state.
- Lesson: when multiple complexity warnings surface, aim for an isolated refactor that reduces one function's branching and then rerun lint/tests to ensure no regressions; the surrounding noise can stay in place until a broader cleanup is scheduled.

Open questions:
- Are there plans to adjust the complexity thresholds or triage the remaining fontsize warnings that still show up under `src/core`?
