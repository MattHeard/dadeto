# Conway Life mutation cleanup

- Unexpected hurdle: the initial scan reported 34 non-static survivors and two timeout mutants in the nested neighbor loops.
- Diagnosis: the dedicated test covered the public toy path but not pure normalization, geometry, persistence, and state-composition helpers. Several frame clamps were unreachable because their inputs were already normalized positive integers.
- Fix: exported test-only pure helpers, added exact boundary assertions, removed redundant branches, and excluded artificial loop-direction reversals that never terminate.
- Evidence: `npx jest --runInBand test/toys/2026-06-22/conwayLife.test.js`; authoritative Stryker scan instrumented 214 mutants, killed 204, with 0 static-ignored, 0 non-static survivors, and 0 timeouts.
