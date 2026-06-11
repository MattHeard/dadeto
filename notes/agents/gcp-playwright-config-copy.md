# GCP Playwright Config Copy

- Unexpected hurdle: the GCP test workflow failed before Playwright execution while building `docker/playwright`.
- Diagnosis path: the non-skipped workflow logs showed Docker failing on `COPY playwright.config.ts ./`; the repository only had `test/e2e/playwright.config.ts`.
- Chosen fix: copy `test/e2e/playwright.config.ts` into the image as `./playwright.config.ts`, matching the path expected by the Playwright entrypoint.
- Next-time guidance: when changing Playwright config location, verify both the workflow script expectations and `docker/playwright/Dockerfile` copy paths. Local Docker was unavailable in this environment, so the cloud workflow was the decisive build validation.
