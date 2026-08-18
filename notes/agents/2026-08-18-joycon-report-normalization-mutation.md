# Joy-Con report-normalization mutation slice

- Diagnosis: report decoding lacked direct coverage, and its empty-report early return was redundant with the canonical decoding path.
- Fix: added empty, standard-layout, and fallback-layout report assertions; removed the redundant early branch rather than preserving equivalent control flow.
- Evidence: bounded Stryker run for `joyConMapper.js:438-459` killed 2/2 mutants with 0 survivors and 0 timeouts; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
