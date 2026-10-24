# AlgZoo Codex investigator adapter

- Unexpected hurdle: a close event emitted from a microtask in the mocked child process raced the adapter's listener setup and left the success test waiting.
- Diagnosis: the test double could complete before reliably modeling the real child process event lifecycle; error and abort paths did not expose the race.
- Fix: schedule successful mock stdout/close with `setImmediate`, then assert process arguments, environment allowlisting, private input, usage settlement, abort, and workspace cleanup.
- Next-time guidance: process adapter tests should model asynchronous child startup/close ordering. This adapter remains prelaunch plumbing: its current request has only a fixture hash, not the fixture, target runner, verified common background, immutable audit store, or live canary evidence.

## Hash-chained audit ledger loop

- Unexpected hurdle: the first scoped core coverage run found untested validation branches, and the aggregate check later found implicit callback/index types in the new module.
- Diagnosis: successful append tests covered the happy path but missed invalid dependency construction, malformed scalar records, non-ENOENT filesystem errors, unterminated JSONL, held-out keys inside arrays, and non-JSON values.
- Fix: added deterministic failure-path tests until the new core ledger reached 100% scoped statement and branch coverage; added explicit JSDoc types and kept the injected local wrapper under the thin-file limit.
- Next-time guidance: integrate start/finish appends into the harness only after the ledger head can be anchored outside the investigator workspace. Hash chaining alone is not an access-control boundary and does not provide OS-enforced append-only storage.
