# Placement and runner window boundary

Duration conversion is now typed, unit-specific arithmetic in `timing.js`, reused
by backward placement and pickup end calculations. Serialized latestPlacement
validation and ISO formatting live in the existing request boundary. Runner
shift/commitment window aliases and their response merging also moved there;
legacy public exports remain available from search-core.

The extraction preserves the original inclusive containment, half-open overlap,
invalid-duration/invalid-timestamp responses, and window alias precedence. The
request boundary does not import search-core, so there is no circular dependency.
Cloud packaging copies the new timing module via the existing directory plan;
verified artifact:
`infra/cloud-functions/object-minute-rental-search/core/object-minute-rental-search/timing.js`.

Evidence: 69/69 rental/timestamp tests and exact 100% statements, branches,
functions and lines for request/index.js and timing.js. Lint, JSDoc types,
dependency checks and cloud packaging pass. Logs:
`.tmp/rental-placement-{tests,lint,types,deps,cloud}.log`; coverage:
`.tmp/rental-placement-coverage`.

Parser gate still exits 1, now reporting only procurement, pickup, composed and
searchResult in search-core (down from seven before this loop). No classifier
configuration or exemptions changed. Duplication still exits 1 at 192 clones
with strict minTokens 14 (`.tmp/rental-placement-{parse,duplication}.log`).

Remaining responsibilities are serialized stage inputs/outputs and composition
response construction. Keep separating those from numeric timing rather than
introducing boundary-to-core import cycles. dadeto-aaou remains open, and final
aggregate success is still required.
