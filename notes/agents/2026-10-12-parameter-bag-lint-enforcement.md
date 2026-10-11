# Enforce parameter-bag arity lint in core

- Unexpected hurdle: the active backlog and bead still referenced a 16-finding
  inventory and `src/core/build/buildCore.js:82`, but that target no longer
  produced a finding.
- Diagnosis: a fresh no-cache ESLint scan with the custom rule explicitly
  enabled found zero findings across 501 `src/core` files. A positive stdin
  fixture independently confirmed that the custom rule reports over-limit
  functions, so the scan exercised the intended rule.
- Fix: enabled `repo/no-parameter-bag-arity-smuggling` as an error for all
  `src/core/**/*.js`. No source suppressions or parameter packing were added.
  Updated the Rank 1 Notion row to record the current scan and next audit file.
- Evidence: enforced no-cache scan covered 501 files with zero findings;
  `test/core/lint/no-parameter-bag-arity-smuggling.test.js` passed (16 tests);
  `npm run check` passed all 10 gates, including unit and E2E tests, 0 clones,
  and 0 audit vulnerabilities; `npm run build` passed.
- Next-time guidance: the old 16-finding inventory is stale. Continue the
  lexicographic cloud audit at `src/cloud/get-api-key-credit-v2/index.js` and
  reconcile the generic function/object adapter factory work with current code.
