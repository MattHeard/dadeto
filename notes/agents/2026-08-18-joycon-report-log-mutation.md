# Joy-Con report-log mutation slice

- Diagnosis: report logging needed direct coverage for its logger prefix and report label string literals.
- Fix: exposed `logHidReportEvent` through the test-only surface and asserted the exact structured output and byte payload.
- Evidence: bounded Stryker run for `joyConMapper.js:515-530` killed 2/2 mutants with 0 survivors and 0 timeouts; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
