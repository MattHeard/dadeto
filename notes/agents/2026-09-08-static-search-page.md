# Static search page completion

- Unexpected hurdle: the aggregate check runner cannot spawn its nested Node processes in this environment (`spawnSync ... node EPERM`), so its test and core-parse results are not code verdicts.
- Diagnosis: the static page already resolved its endpoint through `/config.json`, but a rejected config request poisoned the endpoint promise; the simulator also used the HTTP adapter's broad schedule fixture instead of an explicit capability.
- Chosen fix: make endpoint resolution fall back to the page data attribute, inject a local in-memory schedule provider, add GCS schedule validation tests, and cover disallowed CORS preflight isolation.
- Next time: rerun `npm run check` in an environment that permits child Node processes and resolve the repository's existing `npm audit --audit-level=low` findings before calling the aggregate gate green.
