New story pending redirect contract

Unexpected hurdle:
- The E2E spec had drifted to a synthetic `/story/<id>.html` expectation.

Diagnosis:
- The actual backend contract is:
  - submit returns an id
  - the ephemeral environment eventually writes `pending/<id>.json`
  - the pending JSON contains the real variant path
  - the browser lands on `/p/<page><variant>.html`

Chosen fix:
- Updated the Playwright spec to watch the real submit request and response.
- It now reads the returned id, waits for the pending JSON, and asserts the redirect to the path in that JSON.

Next-time guidance:
- When a cloud flow has a pending-manifest contract, assert the manifest path directly instead of hard-coding the destination URL in the test.
