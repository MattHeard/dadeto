# Local GCP Simulator Idea

Idea to revisit later: build a deterministic, single-threaded local harness that simulates the GCP pieces used by the Playwright E2E flow.

Why it seems useful:
- keep `gcp-test` as the final cloud validation,
- add a faster local loop for debugging failures,
- preserve the browser-facing contract while replacing the cloud dependencies with fakes.

Likely pieces to simulate:
- submit-new-story HTTP flow,
- Firestore writes and trigger follow-ups,
- Storage pending-file generation,
- auth/token handling,
- ordered processing so timing bugs are easier to reproduce.

Open question:
- should this live as a separate local server entrypoint, or as a test harness layered onto the existing local writer/server code?
