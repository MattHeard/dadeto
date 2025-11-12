# Browser-core complexity cleanup

- **Unexpected**: the admin helpers initially had 7-rated functions that could not be simplified without deeper helper extractions; the linter insisted on new branches being lowered rather than suppressing the rule.
- **Diagnosis**: I inspected `reports/lint/lint.txt` to isolate the three offending functions and refactored them by extracting shared helpers (`resolveAdminEndpoint`, `attachSubmitListener`, `validateAdminTokenActionOptions`) so each now delegates its branching to smaller utilities.
- **Fix**: `mapConfigToAdminEndpoints` now funnels its fallback logic through `resolveAdminEndpoint`, `bindRegenerateVariantSubmit` relies on the reusable `attachSubmitListener`, and `createAdminTokenAction` splits the validation and handler logic into dedicated helpers to keep its complexity low.
- **Learning**: when a lint rule reports high complexity, moving branches into well-documented pure helpers is often enough—avoid overloading the exported function with guards if smaller helpers can be reused elsewhere.
- **Next time**: monitor whether the new helpers require tests or extended docs, and only re-run `npm run lint` after the helpers are stable so the report stays tight.
