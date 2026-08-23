# Document hide null-element fix

- Unexpected hurdle: the normal test runner and core-parse checker cannot spawn child Node processes in this sandbox (`EPERM`).
- Diagnosis: Cloud Error Reporting pointed to `hide` dereferencing a DOM element removed during UI teardown; the shared facade had no null guard.
- Fix: make `hide` a no-op for nullish elements, mirror the change in the checked-in runtime copy, and cover the null case in the document facade test.
- Next time: rerun `npm run check` in an environment where child-process spawning is permitted; the focused document test reaches the new regression assertion, while its existing `data:` import case remains environment-dependent.
