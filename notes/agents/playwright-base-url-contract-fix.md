# Playwright base URL contract fix

- Unexpected hurdle: the GCP Playwright job was failing after the function-entrypoint issue was ruled out.
- Diagnosis: `infra/playwright.tf` only set `BASE_URL`, while `test/e2e/playwright.config.ts` reads `PLAYWRIGHT_BASE_URL`.
- Fix: set both env vars in the Cloud Run job so the existing entrypoint logs still work and Playwright receives the configured base URL.
- Next time: check the runner env contract first when the container exits before any spec output appears.
