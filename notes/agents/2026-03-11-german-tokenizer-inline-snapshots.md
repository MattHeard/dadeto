# German Tokenizer Inline Snapshots
- unexpected hurdle: `npm test` reported a worker had to be force-exited due to a teardown leak after the suites passed.
- diagnosis path: reran once to confirm it consistently only raised the teardown warning without failing tests.
- chosen fix: replaced the inline snapshots in `test/toys/2026-02-19/germanTokenizer.test.js` with explicit `toBe` assertions so each rule is spelled out directly.
- next-time guidance: keep inline snapshots out of this toy and watch for lingering timers if Jest complains about workers not exiting.
