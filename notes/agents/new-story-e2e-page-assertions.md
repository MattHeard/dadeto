## New Story E2E Page Assertions

- **Outcome:** Extended `test/e2e/new-story.spec.ts` so the submit flow still verifies the redirect to `/story/story-123.html` and now also checks the rendered story page title, `h1`, submitted content, and submitted author text.
- **Unexpected hurdles & options considered:** The browser spec is intended to run in the GCP test GitHub Actions workflow, so I did not try to force a local Playwright run without the workflow's base URL/environment.
- **Lessons & follow-up ideas:** For future E2E tweaks on this path, keep the redirect assertion and add destination-page content checks immediately after `waitForURL` so the test stays readable and stable.
- **Open questions:** None.
