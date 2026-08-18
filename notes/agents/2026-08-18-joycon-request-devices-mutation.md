# Joy-Con request-device mutation slice

- Diagnosis: the WebHID request helper had no direct behavioral coverage, leaving both unavailable-API guards and the supported request path untested.
- Fix: exposed `requestAndOpenJoyConDevices` through the test-only surface and asserted safe missing-API returns plus the exact Joy-Con vendor/product filters used by `requestDevice`.
- Evidence: bounded Stryker run for `joyConMapper.js:268-277` killed 10/10 mutants with 0 survivors and 0 timeouts; focused Jest passed 20/20; targeted lint and diff checks passed.
- Repository note: unrelated `runnerAvailabilityRegistry` edits remain unstaged and were not included.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
