# Stryker worker OOM

- Unexpected hurdle: the Stryker child process kept restarting during mutation testing even though `npm test` was healthy.
- Diagnosis path: checked the live worker RSS, confirmed the process was running in-band, and compared it with `v8.getHeapStatistics()` on this 4 GiB box. The worker was sitting near the default ~2.32 GiB V8 heap ceiling, which matched the restart pattern.
- Chosen fix: lowered `testRunnerNodeArgs` in `stryker.config.mjs` to `--max-old-space-size=2048` and pinned Jest to `maxWorkers: 1` under `STRYKER_TEST_ENV` so the child runner stays within the 4 GiB machine budget.
- Next time: if restarts continue, the next suspect is retained heap from the hot-swap mutant path, so isolate a leaking suite before changing more global runner knobs.
