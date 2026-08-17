# Symphony app mutation loop

- Unexpected hurdle: dedicated mutation testing exposed 30 survivors, many of which were equivalent through route-level behavior alone.
- Diagnosis: status reconciliation predicates, fallback identifiers, optional titles, and log-path filtering needed direct behavioral coverage.
- Fix: added focused route and helper assertions, split status guards into observable branches, removed a mutation-equivalent title fallback, and exported narrowly testable status helpers.
- Evidence: dedicated Jest 24/24 passed; targeted ESLint passed with zero warnings; Stryker reported 161 mutants, 0 survivors, and 0 timeouts.
- Next time: use the dedicated test file for large local modules and inspect survivor replacements before adding assertions.
