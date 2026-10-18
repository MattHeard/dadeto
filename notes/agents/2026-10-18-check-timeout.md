# Check timeout and coverage memory

- Unexpected hurdle: the full test gate exceeded the original 30-minute timeout. A rerun with a 120-minute process timeout reached a coverage shard that exhausted the 1 GB V8 heap after about 31 minutes.
- Diagnosis: the timeout was configured as 30 minutes both in the local check runner and in the shared check-suite fallback. Coverage is serial and uses 40-test-file shards by default; extending the timeout does not reduce a shard's peak heap use.
- Fix: raise both default timeout values to 120 minutes and update the timeout assertions to 7,200,000 ms. The focused `test/scripts/run-check.test.js` suite passed (19 tests), and ESLint passed on the changed JavaScript files.
- Next-time guidance: retry the full check with a smaller coverage shard size to reduce peak memory, then capture terminal `npm run check` and coverage-summary evidence before closing the deployment bead.
