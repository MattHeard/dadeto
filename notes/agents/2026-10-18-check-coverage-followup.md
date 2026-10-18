# Check coverage follow-up

- **Unexpected hurdle:** The first fast check ran every test shard successfully but failed ESLint because new cases pushed one `describe` callback past the configured function-length limit.
- **Diagnosis:** `npm run lint` reported `test/scripts/plan-check-impact.test.js:95`; the added fallback cases had made the enclosing suite callback 504 lines.
- **Fix:** Split planner selection, selection fallbacks, and fallback execution into separate named `describe` groups. The second `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all five serial test shards and all 10 local gates, with zero duplication clones.
- **Next time:** Use the three-second check heartbeat to track long all-unit fallback runs. Treat `npm run check` as local fast-check evidence; wait for Node 22 `check:full` CI before claiming full coverage or closing the quality bead.
