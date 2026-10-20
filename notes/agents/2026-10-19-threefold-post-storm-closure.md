# THREEFOLD post-storm closure after signal loss

## Unexpected hurdle

The first station-destruction route crossed the relief-gate collision and damaged the wrong structure. The save roundtrip fixture also compared an edited authored spawn even though the spawn is not serialized. After the implementation passed its focused tests, the expanded simulation test file triggered the repository's 450-line callback limit and missing JSDoc warnings. The first matching Full Check later found five uncovered renderer branches: new withdrawals use explicit closedBy state, so the old-state withdrawal toast fallback was not reached.

## Diagnosis and fix

The focused simulation tests showed the station was reachable only by moving north around the lower piling, then crossing above the relief gate and stepping down at the station. The save fixture now moves the player without changing authored spawn. The closure scenarios live in threefold-closure-simulation.test.js, separate from the existing long simulation suite; the repeated-action helper has complete JSDoc.

The signal station is authored as destructible geometry. At aftermath, its console files a report only while intact. The upland road closes the episode by departure even when the station is rubble. closedBy persists across save/export/import, legacy withdrawals migrate to departure, and validation rejects inconsistent reported closures. Kept the renderer's legacy toast fallback and added direct legacy-state cases for both safe and lost passenger/Latchfolk outcomes; this restored 100% renderer coverage.

## Evidence

- Six focused THREEFOLD suites: 108 tests passed; targeted renderer coverage: 100% statements, branches, functions, and lines.
- npm run build: passed.
- npm run check: passed all 10 local gates; 957 suites / 6,573 tests, zero clones, zero audit vulnerabilities.
- GitHub Full Check run 39193977710 passed on head 7d375d37640564e137661ba7b18181c0b5561867; 957 suites / 6,573 tests, 48/48 coverage shards, 100% global and changed-file coverage across statements, branches, functions, and lines, and 11 E2E tests passed. Artifact ID: 12161446711.

## Next-time guidance

When validating scale-growth geometry, trace the exact route through adjacent obstacles before asserting which structure is damaged. Keep authored spawn data stable in persistence tests and override only the live player position. Split newly added behavior into a focused suite before a large callback reaches the configured line limit.
