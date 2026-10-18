# Fast local checks and progress reporting

- **Unexpected hurdle:** Running the full unit fallback in one Jest process exhausted memory; very small serial shards avoided memory pressure but multiplied Jest startup time.
- **Diagnosis:** The impact runner needed a bounded, current worktree test inventory and shard size tuned against actual execution. The aggregate command also needed an independent heartbeat while a child process ran.
- **Chosen fix:** Run impacted tests without coverage locally, fall back to all unit tests in 200-file serial shards, keep full coverage and E2E in the asynchronous full check, and emit active-run progress every three seconds by default. The coverage runner records phase and active shard metadata alongside its heartbeat.
- **Evidence:** `DADETO_CHECK_PROGRESS_INTERVAL_MS=5000 DADETO_CHECK_IMPACT_SHARD_SIZE=200 npm run check` ended with `check-summary` status `passed`, 10 checks, and 0 failures. The all-unit fallback completed in five shards; the final shard reported 152 suites and 1,378 tests passed. `git diff --check` passed.
- **Next-time guidance:** Use the aggregate `check-progress` events to confirm liveness, and judge local behavior separately from the asynchronous full workflow's coverage and E2E result. Keep shard sizing configurable because host memory and Jest startup cost vary.
