# Required env vars now fail fast

- Unexpected hurdle: the original fix only removed the `FIREBASE_CONFIG`/default-database fallback, but `getAllowedOrigins()` still silently treated unknown environments as production.
- Diagnosis path: the full `npm test` run reached 100% functional pass rate but stopped at coverage thresholds, and the coverage report pointed at `src/core/cloud/cors-config.js`. That led to the second fallback in the allowed-origins resolver and a missing branch in the render-variant cloud wrapper test.
- Chosen fix: make `DENDRITE_ENVIRONMENT` a required value, throw on unsupported environment names instead of falling back to production origins, and add a render-variant regression test that exercises the injected cloud console-error path so the branch coverage returns to 100%.
- Next-time guidance: when a deployment env helper has a "safe" default, verify whether that default is actually a hidden prod fallback. If it is, convert it to a hard failure and add one unsupported-value test so the contract stays explicit.
