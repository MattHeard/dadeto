# Admin early-module mutation loop

- Evidence: bounded Stryker scan for lines 1-1100 instrumented 310 mutants; 294 killed, 6 static-ignored, 1 no-coverage, 15 mutation-induced runtime errors, 0 survivors, and 0 timeouts. Baseline passed 84 tests.
- Next-time guidance: preserve the helper and dependency-contract tests; invalid browser environments produce runtime classifications but no surviving mutants.
