# Persisted commitment records

The commitment projector combines asynchronous persisted-record resolution,
identifier normalization, timestamp parsing and fail-closed interval validation.
It now lives at the dedicated `commitment-records/index.js` boundary; the old
module re-exports its public capability for existing browser/cloud callers.

The general rental-search suite does not exercise the projector: a focused
coverage run with that suite correctly reported zero. Use
`test/core/objectMinuteRentalSearchRunnerCommitments.test.js` for this boundary.
It passes 8 tests with exactly 100% all four coverage metrics, recorded in
`/tmp/dadeto-commitment-boundary-tests.log`. Lint, types and dependency gates pass
in `/tmp/dadeto-commitment-boundary-{lint,types,deps}.log`.

Core-parse still exits 1 for other modules, but the projector and its timestamp
helpers no longer violate the boundary gate; see
`/tmp/dadeto-commitment-boundary-gate.log`. No exemptions added. dadeto-aaou is open.
