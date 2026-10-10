# Nightly query latency artifact

- Unexpected hurdle: the existing Firestore runner schedule has a fixed end date in 2027, which would make a fixed 2030 benchmark request miss the configured shift.
- Diagnosis: the endpoint still reads and projects commitments when a request is valid but no shift is available, so a benchmark might appear to pass without exercising a realistic scheduled search.
- Fix: the ephemeral gcp-test workflow now seeds a broad runner schedule, writes 100 assignments plus their 100 segments and 200 points in the test database, calls the deployed API 30 times at concurrency three, and uploads end-to-end p50/p95 JSON. Failures are captured in the artifact and do not block the workflow. The response-path operation counts are omitted because the deployed function does not expose reliable per-request Firestore counts.
- Next time: inspect the first scheduled `query-performance-*` artifact before changing any sample size or adding latency enforcement. Compare both successful-sample count and p50/p95; keep the result observational until repeated runs establish a baseline.
