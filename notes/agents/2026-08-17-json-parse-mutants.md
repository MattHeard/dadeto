# JSON parse explainer mutation loop

- Unexpected hurdle: focused Stryker initially left equivalent fallback literals and regex variants alive.
- Diagnosis: direct exported-helper assertions were needed for multi-digit positions, flexible whitespace, empty Error messages, and negative indexes.
- Fix: added those behavioral assertions and removed an unobservable fallback literal without changing behavior.
- Evidence: focused Jest 9/9 passed; ESLint passed with zero warnings; Stryker reported 49 mutants, 0 survivors, and 0 timeouts.
- Next time: inspect the complete surviving-mutant list before changing the implementation, and prefer assertions on exported parsing helpers.

## Follow-up: local runtime

- Unexpected hurdle: several server error-code mutants were observationally equivalent through the thrown-error path.
- Diagnosis: direct helper assertions were required to distinguish null and code-less error values.
- Fix: covered runtime wiring, request logging, startup messages, permission codes, and exported `getErrorCode` behavior; removed the obsolete `no-ternary` warning rule from ESLint.
- Evidence: focused Jest 9/9 passed; targeted ESLint passed with zero warnings; Stryker reported 59 mutants, 0 survivors, and 0 timeouts.
