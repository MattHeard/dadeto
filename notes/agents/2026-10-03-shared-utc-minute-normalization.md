# Shared UTC-minute normalization

Possession requests and spacetime point registries now use `normalizeUtcMinute` in browser validation. The registry retains its original export as the same function. Possession requests still collect their field-specific errors in the same order. Non-string values are rejected without coercion; the existing Date.parse policy is intentionally retained rather than adding calendar validation.

The initial focused command used the wrong validation test path and therefore covered only two suites. Corrected evidence: `.tmp/shared-utc-minute-final-tests.log`, three suites / 16 tests pass with exact 100% coverage across statements, branches, functions, and lines in all three touched source modules. Added regression coverage for export identity, trimming, non-string non-coercion, forbidden seconds/offsets, invalid month, and the historically accepted February 30 string.

`npm run check -- --skip-tests` passes nine gates; duplication alone fails at 115 clones, down from 116. Evidence: `.tmp/shared-utc-minute-final-static.log`. No threshold change or suppression. The parent bead and goal remain open; full aggregate verification is still required at the next checkpoint.
