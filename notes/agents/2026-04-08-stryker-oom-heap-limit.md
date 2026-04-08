# Stryker worker OOM

- Unexpected hurdle: the Stryker child process kept restarting during mutation testing even though `npm test` was healthy.
- Diagnosis path: checked the live worker RSS, confirmed the process was running in-band, and compared it with `v8.getHeapStatistics()` on this 4 GiB box. The worker was sitting near the default ~2.32 GiB V8 heap ceiling, which matched the restart pattern.
- Chosen fix: raised `testRunnerNodeArgs` in `stryker.config.mjs` with `--max-old-space-size=3072` so the Jest/Stryker child has more headroom.
- Next time: if restarts continue, the next suspect is retained heap from the hot-swap mutant path, so isolate a leaking suite before changing more global runner knobs.
