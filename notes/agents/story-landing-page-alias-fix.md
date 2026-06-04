Story landing page alias fix

Unexpected hurdle:
- The GCP E2E run reached `/story/story-123.html`, but the page title was empty even after the variant module fix.

Diagnosis:
- The render-variant path persisted the variant HTML and pending metadata, but there was no `story/${storyId}.html` object for the redirect target.
- The cloud logs showed a real Playwright failure, while the downloaded HTML report stayed empty, so the useful evidence came from the Cloud Run logs and the browser assertion line.

Chosen fix:
- `render-variant-core.js` now writes a `story/${storyId}.html` landing page for the root variant using the same generated HTML as the variant page.
- Added a regression test to lock in the story landing-page write.

Next-time guidance:
- When a cloud E2E redirect lands on a fixed story URL, check whether the corresponding GCS object is actually written before looking for test flakiness.
