# 2026-08-18: Stryker OOM root cause and guardrails

- Unexpected hurdle: focused mutation runs repeatedly OOMed after the first few mutants even with one concurrent runner.
- Diagnosis path: found 14 stale `.stryker-tmp` sandboxes/backups consuming 5.6 GiB, then reproduced the remaining failure after cleanup. The Stryker schema showed the default `maxTestRunnerReuse: 0`, so one Jest worker was reused indefinitely; the OOM occurred during that reuse cycle.
- Chosen fix: set `maxTestRunnerReuse: 1`, default mutation worker heap to 1024 MiB with a validated `DADETO_STRYKER_HEAP_MB` override, and remove the duplicate hard-coded heap setting from generated worktree configs. Stale generated sandboxes were removed after confirming no active Stryker process.
- Evidence: four `browser-core.js:94` mutants completed 4/4 killed with 0 survivors, 0 timeouts, and 0 no-coverage after the worker-restart setting.
- Next-time guidance: inspect `.stryker-tmp` size and worker reuse before increasing heap limits; restarting the Jest worker is safer than granting each reused worker a multi-gigabyte heap.
