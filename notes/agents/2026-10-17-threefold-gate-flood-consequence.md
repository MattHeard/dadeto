# THREEFOLD relief-gate flood consequence retrospective

- Unexpected hurdle: the first full check used 20-file coverage shards and a one-hour stage timeout; its test stage timed out before finishing. The same run also exposed a renderer helper arity lint violation after passing the outcome as a third argument.
- Diagnosis: 20-file shards required more than the one-hour limit in this workspace. The repo arity rule counts the simulation state fields, so adding a third positional argument pushed `createRenderWorld` over its effective arity limit.
- Chosen fix: rerun with 40-file shards and a two-hour stage timeout. Keep the renderer helper's existing two-argument boundary and derive drainage state from canonical simulation rubble and crisis stage. Add route, counterweight-only, held-gate, surge, aftermath, save/restore, and rendered flood tests.
- Next-time guidance: use 40-file shards for full repository coverage here, allow enough per-stage time, and derive irreversible game outcomes from existing saved state before adding another persistence field.
- Evidence: `DADETO_CHECK_TIMEOUT_MS=7200000 DADETO_COVERAGE_SHARD_SIZE=40 npm run check` passed all 10 gates, including all 11 local E2E tests, 100% aggregate coverage, and zero clones. `npm run build` and the focused THREEFOLD Jest tests also passed.
