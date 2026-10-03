# Clone checkpoint: scanner snapshots and failure serialization

Owning bead: `dadeto-aaou`. The strict jscpd configuration remains unchanged
at `minTokens: 14`, with no exclusions, exemptions, or ignore pragmas added.

## Implementation and regression contracts

Dependency-gate construction now normalizes dependencies before binding the
execution operation. Random-source scans use a named violation projector;
browser scans prepare their dependency record before invoking traversal. The
existing repeated-source test now mutates the first result and proves that a
second scan produces a fresh record with the correct count.

Rental-search failure delivery now obtains the 400 response writer, normalizes
the failure reason, and writes the response record in separate steps. The
non-Error test uses observable coercion and proves the original ordering:
status selection, string conversion, JSON delivery. Error and non-Error payload
coverage remains intact.

## Hurdles and next-time guidance

The initial projector extraction left the count unchanged because the fresh
report still matched the factory's nested binding tail. Separating dependency
normalization from binding was the tighter fix; do not assume extracting an
arrow callback eliminates all overlapping matches.

Adding the coercion-order regression pushed the HTTP suite's describe callback
over the existing 450-line limit. Split the failure/environment tests into a
separate coherent group, preserving shared module fixtures and all assertions;
do not remove assertions or relax lint. The aggregate started before this fix
was explicitly terminated (exit 143) and is not acceptance evidence. Only the
final grouped run below is authoritative.

## Evidence

- `.tmp/scanner-snapshot-tests.log`: 43 scanner tests pass with exact 100%
  lines, statements, functions, and branches for the dependency gate.
- `.tmp/scanner-snapshot-static.log`: all nine non-duplication static checks
  pass; strict clones reduced from 20 to 19.
- `.tmp/scanner-search-static.log`: all nine non-duplication static checks pass;
  strict clones reduced to 18 before the final ordering assertion.
- `.tmp/scanner-search-grouped-tests.log`: 102 tests across two suites pass;
  exact 100% of all four coverage metrics for the dependency gate, rental-search
  factory, and request boundary.
- `.tmp/scanner-search-grouped-lint.log`: `npm run lint` exits 0.
- `.tmp/scanner-search-build.log`: `npm run build` exits 0.
- `.tmp/scanner-search-cloud-build.log`: `npm run build:cloud` exits 0.
- Final aggregate command:
  `TMPDIR=/home/matt/dadeto/.tmp DADETO_COVERAGE_SHARD_SIZE=40 npm run check`,
  artifact `.tmp/scanner-search-grouped-full-check.log`: terminal exit 1 solely
  for duplication at 18 clones. All 21 test shards pass; the outer summary has
  ten gates and exactly one failure. Exact global coverage from
  `reports/coverage/coverage-summary.json`: lines 20342/20342, statements
  21196/21196, functions 7080/7080, branches 10201/10201. The goal remains active
  until zero clones and a fully green aggregate check are verified.
