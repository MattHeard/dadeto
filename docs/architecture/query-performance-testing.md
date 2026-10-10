# Query performance tests

Query performance contracts belong beside the query's semantic tests. Count
work at the storage or dependency boundary instead of asserting elapsed time in
the normal test suite. Use a small fixture and a representative large fixture
when the contract concerns scaling.

The Firestore runner-commitments repository is the first example. Its
`listForRunner` query performs one indexed assignment query and at most two
batched dependent reads for matching segments and spacetime points. The test
uses 100 commitments and asserts the storage round-trip count stays at three;
the number of documents read and materialized still grows with the matching
result. Semantic projection tests remain separate.

When a work-budget test fails, investigate the additional storage or dependency
work introduced by the change. Repair or simplify the query or projection
before changing the budget. Update the budget only when the intended query
contract has deliberately changed, and record that reason with the test.

Do not assert absolute latency in ordinary Jest tests. The scheduled GCP test
workflow provisions 100 matching commitments, 100 segments, and 200 points,
sets a stable runner schedule, then sends 30 identical requests for the fixed
2030 possession window at concurrency three. The JSON artifact records the
fixture size, request window, per-request end-to-end HTTP timings, and p50/p95.
The artifact is observational: request failures are recorded there and do not
block the workflow. Deployed Firestore operation counts are omitted until they
can be captured reliably; the deterministic repository test continues to
enforce the three-round-trip contract while document-read work grows with the
fixture size.
