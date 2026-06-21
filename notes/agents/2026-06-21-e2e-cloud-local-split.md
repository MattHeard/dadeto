Unexpected hurdle: the e2e split changed the local Playwright runner to wait on a writer process as well as the simulator, which broke the runner unit tests until they modeled the third child process and the writer readiness signal.

Diagnosis path: local `npm run test:e2e:local` passed, but `npm test` stalled in `test/core/local/gcp-simulator/playwright-runner*.test.js`; the failure was a harness mismatch rather than a product regression.

Chosen fix: moved local-server Playwright specs under `test/e2e/local/`, narrowed the cloud config to cloud-only specs, and updated the runner tests to reflect the new simulator-plus-writer flow.

Next-time guidance: when the local runner gains another subprocess or readiness gate, update the fake child-process fixtures in both runner specs first so the Jest harness stays aligned with the actual process topology.
