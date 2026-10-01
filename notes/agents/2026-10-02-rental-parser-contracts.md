# Rental parser contracts

The validator-only gate masked the second parsing gate because npm chains them
with `&&`. Parse HH:MM into numeric components consumed by timezone conversion;
parse and normalize circle geometry into a structured containment result before
projecting the public boolean. Preserve the existing pass-through and fallback
semantics.

Evidence: 58 rental-search tests pass and both changed modules have exactly 100%
coverage across all four metrics (`/tmp/dadeto-rental-parser-coverage.log`). Strict
lint and type checking pass (`/tmp/dadeto-rental-parser-lint.log` and
`/tmp/dadeto-rental-parser-types.log`). `npm run core-parse` still exits 1, but
parse-not-validate passes; parse-boundary now exposes violations in six formerly
exempt modules (`/tmp/dadeto-rental-parser-gate.log`). Move genuine parsing into
boundary modules next; do not restore exemptions. dadeto-aaou remains open.
