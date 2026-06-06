# GCP test E2E response-status cleanup

- Unexpected hurdle: several E2E smoke tests still asserted directly on `goto()` response status or response payloads even though the visible page content was already enough to prove the page loaded.
- Diagnosis path: I searched the E2E suite for `status()` / response assertions and found the pattern in `about.spec.ts`, `admin.spec.ts`, `manual.spec.ts`, `mod.spec.ts`, `404.spec.ts`, `new-page.spec.ts`, `new-story.spec.ts`, and the seeded fixture test.
- Chosen fix: removed the direct response checks, kept the setup fetches that provide fixture/config data, and changed the tests to wait on the rendered page and redirect outcome instead.
- Next-time guidance: when an E2E test is meant to protect user flow, prefer rendered title/heading/content assertions first and treat network response checks as setup-only unless the response itself is the contract under test.
