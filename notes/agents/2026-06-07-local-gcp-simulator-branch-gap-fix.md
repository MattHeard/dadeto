# Local GCP simulator branch-gap fix

- Unexpected hurdle: the new local simulator harness was functionally correct, but the repo gate was still failing on a tiny set of uncovered simulator branches.
- Diagnosis path: focused coverage on `test/local/gcp-simulator.test.js` showed the remaining gaps were mostly untested success paths in `simulator.js`, plus two defensive branches that were not realistically reachable through the existing helper surface.
- Chosen fix: add one isolated success-path simulator regression that exercises successful moderation assignment, rating, incoming-option lookup, no-body fallbacks, and moderation metadata fallback rendering; simplify the unreachable defensive branches in `simulator.js`.
- Next-time guidance: when a local harness is close to green, check for unreachable defensive branches separately from real behavior gaps, and prefer a focused isolated simulator fixture over mutating the shared seed state.
