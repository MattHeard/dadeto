# gcp-test new-story submit failure

- Unexpected hurdle: the latest `gcp-test` run reached the Playwright phase, but the `submits the new story form` case failed after the form POST returned a non-OK response.
- Diagnosis path: I checked the workflow logs for run `26970389700`, downloaded the preserved Playwright/job artifacts, and compared the current head `3102efe1f` against the prior successful `gcp-test` head. The failing step is isolated to `test/e2e/new-story.spec.ts:87`, with the submit response assertion failing at line 179.
- Chosen fix: not applied in this pass. The likely next target is the submit-new-story live path or its environment contract, not the browser shell or Terraform bootstrap.
- Next-time guidance: inspect the `submit-new-story` function response status/body directly, and verify the live test environment is supplying the exact origin/env values that the function expects before widening scope.
