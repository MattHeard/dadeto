# Test suite fixes — 2026-08-04

- Unexpected hurdles: the full unit run exposed three unrelated regressions after the first failure; local E2E could not launch Chromium because `libnspr4.so` is unavailable.
- Diagnosis: targeted Jest runs isolated missing page-data handling, stale `typedOptions` references, an over-broad checkout-package mock, and a missing ESM `jest` import.
- Fix: guard missing page data, use the actual launcher options, make the package mock reflect lookup behavior, and import `jest` explicitly.
- Next time: install the host Playwright/Chromium shared-library dependencies before treating local E2E launch failures as application failures.
