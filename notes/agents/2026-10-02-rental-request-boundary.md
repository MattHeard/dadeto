# Rental request boundary extraction

Moved request shape, environment durations, wall-clock conversion and legacy
schedule parsing into `src/core/object-minute-rental-search/request/index.js`.
The HTTP coordinator keeps its public request/time exports and delegates parsing.
The boundary uses the existing canonical index-entry convention, not a new gate
exemption. No ts-nocheck was added to the new module.

An extraction initially split a JSDoc opener from its body; syntax and lint caught
it immediately. Check exact comment boundaries when moving a contiguous block.
Schedule date parsing explicitly stringifies optional timestamps, retaining
Date.parse's prior coercion while satisfying the type checker.

Acceptance: 58 rental tests pass with both modules at100% all coverage metrics
(`/tmp/dadeto-request-boundary-tests.log`). Lint, types and dependency gates pass
(`/tmp/dadeto-request-boundary-{lint,types,deps}.log`). Core-parse still fails in
other formerly exempt modules, but no longer reports the HTTP coordinator
(`/tmp/dadeto-request-boundary-gate.log`). dadeto-aaou remains open.
