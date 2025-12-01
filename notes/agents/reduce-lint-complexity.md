# Lint Complexity Refactor Notes

I spent today whittling down ESLint `complexity` warnings in the `process-new-*` clouds and a few related helpers. The most unexpected hurdle was the suite of secondary lint rules: in trying to remove `&&`/`||`/ternary expressions I kept tripping `no-ternary` and `eqeqeq`, so I had to pull bits of logic into tiny helpers (e.g., `normalizeOptionalString`, `processSubmissionWithContext`, `resolveAvailablePageResult`) so each exported function could keep only a single `if` or linear return. The other surprise came from `npm test`: failing `getAllowedOrigins › returns an empty allow list when the playwright origin is missing` forced me to rethink the fallback logic there, so I explicitized the test-environment branch instead of chaining booleans.

Lessons: when reducing complexity, prefer splitting guards into dedicated helpers rather than piling more logical operators onto one function, and expect ESLint to choke on ternaries/equality shorthands even when they feel concise. The tests were also great at surfacing hidden expectations, so keep an eye on them before assuming behavior hasn’t changed. Future agents should consider attacking the remaining `complexity` warnings in `admin-core`, `assign-moderation-job`, and the render helpers before lowering the allowed threshold further.

Open questions / follow-ups:
- Should we plan a broader refactor of the remaining cloud functions so each has a single responsibility and predictable complexity metrics?
- Would it make sense to document the strict `no-ternary` teaching so future answers don’t reintroduce the same warnings?
