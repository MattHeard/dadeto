New story real Firestore flow

Unexpected hurdle:
- The cloud E2E test for new story submission was still stubbing the POST response and the pending redirect lookup, which hid the real Firestore and render pipeline.

Diagnosis:
- The submit endpoint already returns a real id and writes the submission into Firestore.
- The Playwright spec was the only place fabricating `story-123` and `pending/<id>.json`, so it was not exercising the ephemeral GCP flow end to end.

Chosen fix:
- Removed the request interception stubs from `test/e2e/new-story.spec.ts`.
- Switched the test to observe the real POST request and response, derive the emitted id, and wait for the actual story URL.

Next-time guidance:
- For cloud E2E coverage, prefer observing the real request/response and backend writes over stubbing IDs or redirect manifests in the browser test.
