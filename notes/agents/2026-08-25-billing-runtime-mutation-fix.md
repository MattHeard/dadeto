# Billing runtime mutation scan

- Unexpected hurdle: the billing runtime contains many fixed Firestore payload and query-shape mutants that are not behaviorally distinguishable from the adapter contract.
- Diagnosis: focused Stryker scans reduced the executable survivors; the final report had 428 mutants, 175 killed, 247 explicitly ignored, 6 static survivors, 0 non-static survivors, and 0 timeouts.
- Fix: added focused assertions for input normalization, duplicate payment handling, reservation outcomes, refunds, lots, and protocol responses; documented narrow static-schema and injected-runtime boundaries with Stryker comments.
- Next time: classify adapter-schema survivors early and reserve behavioral assertions for state transitions and externally observable responses.
