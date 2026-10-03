# Clone checkpoint: managed input binding specifications

Owning bead: `dadeto-aaou`. Strict jscpd stays at `minTokens: 14`; no threshold,
exclusion, exemption, or ignore-pragma changes were made.

## Changes and behavior contracts

Wage numeric fields now prepare a binding specification separately from listener
and DOM attachment. The existing form regression additionally proves that every
numeric input's type, placeholder, and initial value are configured before its
input listener is registered. Existing tests retain hidden-payload updates and
managed cleanup behavior.

Life-seed's live-cell update callback is prepared separately from labelled-field
attachment. Its reset checkbox likewise has a prepared binding specification;
the callback still reads the created checkbox when invoked, toggles the reset
flag, and synchronizes the hidden payload. Existing regressions cover valid and
invalid coordinate input, fallback state, reset activation/deactivation, field
order, and disposal wiring. There is no change to the public handler API.

## Diagnosis and next-time guidance

The report grouped short nested object/callback closing tails across otherwise
unrelated forms. Preserve the shared labelled-field utility: the duplication was
in caller composition, not justification for copying event/DOM behavior. Explicit
specification and attachment phases removed the reported wage/blog-key/life-seed
tail matches, and naming the cell-update callback removed the keypad overlap.
Measure net progress from the fresh report rather than inferring it from an old
pair; the strict count moved 17 -> 16 -> 14.

## Evidence

- `.tmp/wage-field-order-tests.log`: seven tests pass; exact 100% lines,
  statements, functions, and branches for the wage handler.
- `.tmp/life-field-binding-tests.log`: eight tests pass; exact 100% of all four
  metrics for the life-seed handler.
- `.tmp/wage-field-order-lint.log` and `.tmp/life-field-binding-lint.log`:
  explicit `npm run lint` runs exit 0.
- `.tmp/managed-field-static.log`: `npm run check -- --skip-tests` exits 1 solely
  for duplication (14 clones); all nine other gates pass.
- Final aggregate command: `TMPDIR=/home/matt/dadeto/.tmp
  DADETO_COVERAGE_SHARD_SIZE=40 npm run check`, artifact
  `.tmp/managed-field-full-check.log`.
- Site build: `npm run build`, artifact `.tmp/managed-field-build.log`.
- Site build terminates with exit 0. The full check terminates with exit 1 solely
  for duplication at 14 clones. All 21 test shards pass and the outer ten-gate
  summary has exactly one failure. Exact global coverage from
  `reports/coverage/coverage-summary.json`: lines 20349/20349, statements
  21204/21204, functions 7081/7081, branches 10198/10198. The goal stays active
  until zero clones and a completely green aggregate check.
