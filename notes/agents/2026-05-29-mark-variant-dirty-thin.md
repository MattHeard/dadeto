Unexpected hurdle: the first mark-variant-dirty run-helper refactor reduced the non-core line count, but the new core helper temporarily lost global coverage because the request-path closures were only wired, not exercised.

Diagnosis path: I narrowed the failure with a targeted coverage run on `src/core/cloud/mark-variant-dirty/run.js`, which showed the missing `app.post` wrapper and request-auth closure coverage.

Chosen fix: I removed the extra `app.post` lambda, added a focused request-path test that drives the returned handler through the not-found branch, and kept the cloud entrypoint thin.

Next-time guidance: when extracting a cloud `run` helper, include both a wiring test and one real request-path test so helper closures stay covered while the wrapper shrinks.
