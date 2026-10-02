# Rental timestamp boundary checkpoint

Moved timestamp coercion into the existing rental request boundary and retained
the public `parseTime` re-export. Invalid timestamps still yield NaN.

Evidence: the focused rental suite passes 58 tests with all four coverage metrics
at 100% for `request/index.js` (`/tmp/dadeto-time-boundary-tests.log`). Repository
lint, JSDoc types, and dependency checks pass in the corresponding
`/tmp/dadeto-time-boundary-{lint,types,deps}.log` files.

The approval reviewer recovered and `npm run core-parse` executed again, exiting
1. Its report at `/tmp/dadeto-time-boundary-parse.log` still identifies eleven
functions in `search-core.js`. Moving timestamp coercion alone does not complete
the parsing/domain separation. Continue with typed interval inputs and separate
response assembly rather than adding classifier exemptions.

The owning bead remains dadeto-aaou. The last aggregate run is not green;
duplication and thin adapters also remain outstanding. Do not close the bead on
focused-test evidence.
