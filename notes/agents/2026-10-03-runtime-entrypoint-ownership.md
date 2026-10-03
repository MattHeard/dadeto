# Runtime and command callback ownership

This batch takes three strict-report targets without changing minTokens 14,
source scope, exemptions, or ignore rules.

The writer startup now has one deferred listening callback and one receiver-bound
`server.listen` invocation. Its argument list retains explicit-host and default
overloads. The regression checks host trimming, logging deferral, and receiver
identity. Evidence: `.tmp/writer-startup-tests.log` (9 tests, exact 100% owner
coverage) and `.tmp/writer-startup-static.log` (33 clones, previously 34).

Config and seed routes share a JSON payload-factory adapter. Payload builders run
for each request, not while wiring routes: changing API_BASE_URL affects the next
config request, and mutating a seed response cannot contaminate later responses.
The adapter preserves response.json's receiver and returns undefined even when
response.json returns the response. `.tmp/local-runtime-checkpoint-tests.log`
passes 21 tests with exact 100% for both local runtime owners.
`.tmp/local-json-route-static.log` reports 32 clones. One new seed/hi-lo object
tail replaces one of the two removed closure tails; use the fresh report rather
than assuming removal of a source pair removes every related match.

The build-entrypoint command factory binds a named check operation to its
snapshotted collaborators. The operation rereads configuration and source on
each invocation; its regression checks creation is lazy, changing configured
paths, output counts, and undefined returns. `.tmp/entrypoint-operation-tests.log`
passes 5 tests with exact 100% owner coverage. After explicit lint completed,
`.tmp/entrypoint-operation-static.log` reports 31 clones with all other nine
gates passing.

Build: `.tmp/runtime-entrypoint-build.log`. Aggregate checkpoint:
`.tmp/clone-goal-31-full-check.log` terminated exit 1: all 21 test shards passed,
and the outer ten-gate summary failed only duplication (31 clones). Exact global
coverage: lines 20332/20332, statements 21186/21186, functions 7074/7074,
branches 10205/10205. Verify terminal exit and the outer summary separately from
the test runner's inner summary. Remaining clones stay in `dadeto-aaou`; this
note does not claim goal completion.

Next time, separate payload/operation ownership from delivery callbacks, and
regress lazy execution explicitly. Avoid caching environment-derived payloads
or nested fixture objects as a side effect of factoring route wiring.
