# Query performance tests

Query performance contracts belong beside the query's semantic tests. Count
work at the storage or dependency boundary instead of asserting elapsed time in
the normal test suite. Use a small fixture and a representative large fixture
when the contract concerns scaling.

The Firestore runner-commitments repository is the first example. Its
`listForRunner` query performs one indexed assignment query and at most two
batched dependent reads for matching segments and spacetime points. The test
uses 100 commitments and asserts the storage operation count stays at three;
the amount of data returned by the batches may grow with the matching result.
Semantic projection tests remain separate.

When a work-budget test fails, investigate the additional storage or dependency
work introduced by the change. Repair or simplify the query or projection
before changing the budget. Update the budget only when the intended query
contract has deliberately changed, and record that reason with the test.

Do not assert absolute latency in ordinary Jest tests. The scheduled GCP test
workflow is the place for deployed latency sampling and machine-readable p50
and p95 artifacts; those measurements should remain observational until a
reliable baseline exists.
