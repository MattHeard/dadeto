# File-handler mutation loop

- Unexpected hurdle: Stryker's local logging socket was blocked in the restricted sandbox, and a test-only export introduced an artificial timeout mutant.
- Diagnosis: reran the focused mutation set with local-process permission, then removed the instrumentation and verified the production surface directly.
- Chosen fix: added behavioral assertions for creation, reuse, empty/null selection, event wiring, disposal, and uploaded-value propagation.
- Evidence: 25/25 mutants killed, 0 survivors, 0 timeouts; focused Jest 6/6 and ESLint passed. The full check still has unrelated repository failures recorded in the next loop.
- Next time: run Stryker with permission to open its local logging socket and avoid exporting private helpers solely for mutation coverage.
