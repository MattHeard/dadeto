Unexpected hurdle: `npm test` was not hanging in the Jest suites; it was failing after Jest finished when the coverage summary step expected `reports/coverage/coverage-final.json`.

Diagnosis path: verified `scripts/run-jest-with-coverage.js` and `src/local/write-coverage-summary.js`, reproduced the missing-file error path directly, then ran the repo gate to separate the post-Jest coverage failure from unrelated lint/threshold noise.

Chosen fix: create `reports/coverage` before the Jest run, and make the coverage-summary helper throw a clear ENOENT-specific error when coverage output is absent while rethrowing unrelated read errors unchanged.

Next-time guidance: if `npm test` fails again, check whether it is the post-Jest coverage step, the global coverage threshold, or the lint gate before changing test runner behavior.
