# JoyCon stored-row mutation slice

- Unexpected hurdle: an interrupted Stryker run left instrumentation in the source, and the broad rerun reported string survivors that were not reproducible in isolation.
- Diagnosis path: restored the generated source safely while preserving intended exports, then isolated the active and optional return-string mutants separately.
- Chosen fix: exported stored-capture and started-row helpers and added direct plus caller-level assertions for mapped/missing captures and matching/non-matching indexes.
- Evidence: stored-capture mutants were killed in the bounded scan; active-row and optional-row string mutants were each killed in isolated Stryker runs; focused Jest passed 46 tests; targeted ESLint passed.
- Next-time guidance: when a broad report conflicts with direct behavioral tests, isolate the individual mutant before adding redundant assertions.
