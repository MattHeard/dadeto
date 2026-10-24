# AlgZoo Codex investigator adapter

- Unexpected hurdle: a close event emitted from a microtask in the mocked child process raced the adapter's listener setup and left the success test waiting.
- Diagnosis: the test double could complete before reliably modeling the real child process event lifecycle; error and abort paths did not expose the race.
- Fix: schedule successful mock stdout/close with `setImmediate`, then assert process arguments, environment allowlisting, private input, usage settlement, abort, and workspace cleanup.
- Next-time guidance: process adapter tests should model asynchronous child startup/close ordering. This adapter remains prelaunch plumbing: its current request has only a fixture hash, not the fixture, target runner, verified common background, immutable audit store, or live canary evidence.
