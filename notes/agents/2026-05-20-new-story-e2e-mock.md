# New Story E2E Mock Follow-up

Unexpected hurdle: the `test/e2e/new-story.spec.ts` case was still depending on the live submit Cloud Function and failing with a `500` in `gcp-test`.

Diagnosis path: the page itself loads from the proxy, but the submit step fans out into the backend write path and pending redirect. That makes the test sensitive to runtime/cloud state rather than the browser contract we actually want to protect here.

Chosen fix: delete `test/e2e/writer.spec.ts` as requested and change the new-story Playwright case to mock the submit response plus the pending redirect. The test now verifies the form wiring, payload shape, and success navigation without calling the live backend.

Next-time guidance: if we need a true backend integration check for story submission, isolate it under a separate cloud-specific test harness instead of coupling it to the browser smoke.
