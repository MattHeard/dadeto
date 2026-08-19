# Billing-core mutation slice

- Unexpected hurdle: the first complete scan exposed 20 survivors, including equivalent null/type guards and checkout-response branches whose observable outcomes were not distinguished by broad throw assertions.
- Diagnosis: validation tests needed exact error messages and side-effect assertions; two guard shapes were redundant enough that their mutants preserved the same failure behavior.
- Chosen fix: added exact validation and checkout assertions, including callable invalid offers, null responses, invalid URLs, and navigation suppression. Refactored response validation to null-safe optional property checks and offer validation to `value?.packages`.
- Evidence: the final Stryker scan for `src/core/browser/billing/billing-core.js` executed 86 mutants and killed all 86 with 0 survivors and 0 timeouts. Focused Jest passed 8 tests, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: when broad `toThrow` assertions leave guard mutants alive, assert the exact error object/message and observable side effects; remove redundant guard combinations when they are behaviorally equivalent.
