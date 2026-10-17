# Interpretability portable import loop

- Unexpected hurdles: the first aggregate run flagged the local name `document` as a browser global in `src/core`, and jscpd identified a small clone between malformed-JSON and unsupported-version errors.
- Diagnosis: the core global checker matches the browser `document` identifier; the import function also repeated the same one-error result shape.
- Fix: renamed the parsed JSON value and export envelope to `parsedDocument` and `graphDocument`, and centralized import failures in a shared helper. Added versioned import validation for all six record collections plus graph ID/reference invariants.
- Zod boundary: the importer receives schema validators from its caller; focused tests passed with installed Zod and the forced local fallback. The checked-in tests do not require Zod.
- Evidence: focused interpretability suites passed 29 tests in both modes; `npm run tsdoc:check`, `npm run depcruise`, and `npm run duplication` passed. Final `npm run check` passed all 10 gates, with 100% line, statement, function, and branch coverage, zero clones, and 11/11 browser checks. Artifacts: `reports/coverage/coverage-summary.json` and `reports/duplication/jscpd-report.json`.
- Next-time guidance: avoid browser-global identifier names in core even for plain data objects; share stable error constructors when multiple parse branches return the same shape.
