Unexpected hurdle: the repo-wide `npm test` run failed outside this slice, so it was easy to over-attribute risk to the non-core-thin change.

Diagnosis path: I verified the changed checker with `npx jest test/core/local/non-core-thin/status.test.js --runInBand --watchman=false` and confirmed the only local contract change was returning `{ exitCode, failures }` from the handle and propagating it through the script.

Chosen fix: I updated the handle to return an explicit result object, switched the script to `process.exitCode = result.exitCode`, and tightened the test to assert the new shape.

Next-time guidance: when `npm test` fails for an unrelated reason, keep a targeted test run for the edited module as the local acceptance gate and record the repo-wide failure separately instead of blocking the slice.
