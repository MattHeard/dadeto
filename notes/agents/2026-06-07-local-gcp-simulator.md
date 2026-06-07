# Local GCP Simulator

Unexpected hurdle:
- The first fake Firestore implementation deadlocked when trigger handlers wrote back into the same database during seeding.

Diagnosis path:
- The seed step never completed, and a standalone Node smoke showed the promise hanging without any useful stack.
- The failure was traced to the commit queue waiting on trigger handlers while those handlers were waiting on more queued commits.

Chosen fix:
- Removed the queue lock from the fake Firestore and let commits recurse directly in a single process.
- Kept atomicity at the batch boundary, but allowed trigger-induced writes to run immediately so `process-new-story` and the renderers can complete.
- Added a lightweight local HTTP server that serves `/config.json`, `/seed.json`, and the `/__sim/*` backend endpoints the browser pages expect.
- Aligned the stats writer with the simulator bucket via `STATIC_BUCKET_NAME`.

Next-time guidance:
- If this harness grows, keep the fake backend single-process and deterministic.
- Add new trigger surface area by expanding the local simulator first, then wiring Playwright to it, rather than introducing another ad hoc mock path.
