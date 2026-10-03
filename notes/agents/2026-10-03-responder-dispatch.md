# Submission response dispatch

The same-file clone was two unnecessary wrappers around the handler table.
The table key now owns payload classification, and the public dispatcher owns
one invocation. Objects still use JSON, undefined uses sendStatus, and other
values use send. Keep response method receivers and ignore transport returns.

Focused suites: submit-shared.test.js and submit-shared.coverage.additional.test.js,
22 tests pass and exact 100% owner coverage across all four metrics. Evidence:
`.tmp/responder-dispatch-tests.log`. Static aggregate exits 1 for duplication
only (49 clones, down from 50), other gates pass:
`.tmp/responder-dispatch-static.log`. Regular and cloud builds are recorded in
`.tmp/responder-dispatch-build.log` and `.tmp/responder-dispatch-cloud-build.log`.

No detector configuration or suppression changes. dadeto-aaou remains active.
