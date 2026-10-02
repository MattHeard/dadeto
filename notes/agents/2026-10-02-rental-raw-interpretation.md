# Rental raw product and timestamp interpretation

Moved exact product-text interpretation, possession timestamp validation, and
serialized containment/overlap coercion into the existing request boundary.
`search-core.js` retains compatibility exports and imports the same functions
for fulfillment orchestration. No new boundary exemption or classifier change
was introduced. The new code is covered by existing behavioral tests plus the
direct timestamp compatibility regressions.

Evidence: focused rental and timestamp suites pass 69/69 tests, with exact 100%
statements, branches, functions, and lines for request/index.js. Repository
lint, JSDoc types, dependency checks, and cloud packaging pass. Logs are
`.tmp/rental-interpretation-{tests,lint,types,deps,cloud}.log`; focused coverage
is under `.tmp/rental-interpretation-coverage`.

`npm run core-parse` still exits 1, but the report is reduced from eleven to seven
functions in search-core: latestPlacement, runnerInterval, procurement, pickup,
composed, searchResult and withRunner. See `.tmp/rental-interpretation-parse.log`.
The remaining functions mix serialized request/result shapes with numeric timing
and orchestration; continue separating those actual responsibilities, rather
than modifying gate classification or suppressing errors.

Duplication evidence is `.tmp/rental-interpretation-duplication.log` and
`reports/duplication/jscpd-report.json`. dadeto-aaou remains open; focused results
do not prove aggregate completion.
