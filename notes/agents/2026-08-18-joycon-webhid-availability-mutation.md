# Joy-Con WebHID availability mutation slice

- Diagnosis: availability guards needed direct coverage for absent browser globals and browsers without WebHID.
- Fix: exposed `initializeWebHidCapture` through the existing test-only surface and asserted both safe early-return paths.
- Evidence: bounded Stryker run for `joyConMapper.js:193-205` killed 2/2 mutants with 0 survivors and 0 timeouts; focused Jest passed 14/14; targeted Joy-Con lint and diff checks passed.
- Repository note: the full lint command remains affected by unrelated shared-worktree warnings in `runnerAvailabilityRegistry`; those files were not staged.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
