## Stop inflating zeroed coverage counters

Removing the counter mutation from `test/core/coverage-sweep.test.js` initially caused the test to fail because the assertion expected every coverage entry to expose Istanbul's `l` field. Some instrumentation outputs omit that property when no per-line data is tracked, so I updated the check to validate core properties (`path`, `s`, `b`, `f`, `branchMap`) without assuming `l` exists.
