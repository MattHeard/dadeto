# THREEFOLD alternate Quieting evidence

- Unexpected hurdle: the broad campaign spec asks for alternate investigations when Iri dies or escapes, but the current episode state has no regulator encounter or explicit Iri fate.
- Diagnosis: inspected the saved Broken Gate episode, renderer, and the Tidal Archive, Silt Margin, and Weftways routes. Their evidence records already use independent route state and do not require the optional Broken Gate report/confession.
- Fix: added regressions that preserve this independence for each alternate evidence source, and documented the current boundary without claiming Iri's death/escape scenario complete.
- Evidence: focused impact passed 3 suites / 43 tests; ESLint passed. `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 local gates across five serial shards (984 suites / 6,910 tests), with zero clones and zero audit vulnerabilities. This fast check excludes full coverage and E2E; exact-head CI for this slice is pending.
- Next time: once the regulator encounter and Iri fate enter campaign state, extend these regressions across alive, escaped, and dead outcomes. Beads access remains blocked by the shared Dolt access lock; do not remove the lock manually.
