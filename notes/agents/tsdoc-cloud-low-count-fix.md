# Low-count cloud TSDoc fixes

- Unexpected hurdle: the targeted TSDoc diagnostics were mostly caused by JavaScript declaration inference at dependency seams, not missing documentation.
- Diagnosis: filtered `npm run tsdoc:check` output by the six requested cloud paths and inspected the inferred callback, Firestore, Express, and trigger contracts.
- Chosen fix: tightened one return annotation and added narrow boundary casts where injected Firebase/Express test doubles intentionally differ from production library types.
- Evidence: the six targeted paths produce zero diagnostics after `npm run tsdoc:check`; the full gate still has unrelated pre-existing failures in broader cloud paths plus environment/audit/lint checks.
- Next time: preserve the same narrow-cast approach and address the remaining high-count cloud directories separately.
