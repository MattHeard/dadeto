# GCP Playwright cwd pin

Unexpected hurdle: the Playwright report in GCP kept coming back as `No tests found` even after the entrypoint started logging the test tree and the local CLI reproduction still listed the suite.

Diagnosis path: the container entrypoint used relative paths for both the Playwright config and the `test/e2e` tree. The Cloud Run runtime can start the container from a different working directory than the repo root, which means `./playwright.config.ts` can resolve to the nested `test/e2e/playwright.config.ts` instead of the repo-root config and discovery can collapse to zero tests.

Chosen fix: pin the entrypoint to `/app` up front, use absolute paths for the Playwright config and test directory, and keep the discovery logging so the next run can confirm the container is starting from the expected root.

Next-time guidance: when a Cloud Run job reports Playwright discovery failures, log and pin the runtime cwd first. Relative config paths are too easy to misresolve when the container entrypoint is reused across local and GCP execution contexts.
