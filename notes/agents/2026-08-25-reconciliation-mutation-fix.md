# Reconciliation mutation scan

- Unexpected hurdle: direct collection-default and provider-identity projection mutants were equivalent to the fixed reconciliation schema under the injected persistence boundary.
- Diagnosis: the focused scan killed behavioral mismatch paths; exact empty-row provider matching verified the purchase identity projection.
- Fix: added the empty-row provider match assertion and documented only fixed collection/schema projections as ignored. The final scan reported 21 killed, 20 ignored, 0 survivors, and 0 timeouts.
- Next time: include provider rows with empty and populated purchase identities in reconciliation tests.
