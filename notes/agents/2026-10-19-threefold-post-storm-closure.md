# THREEFOLD post-storm closure after signal loss

## Unexpected hurdle

The first station-destruction route crossed the relief-gate collision and damaged the wrong structure. The save roundtrip fixture also compared an edited authored spawn even though the spawn is not serialized. After the implementation passed its focused tests, the expanded simulation test file triggered the repository's 450-line callback limit and missing JSDoc warnings.

## Diagnosis and fix

The focused simulation tests showed the station was reachable only by moving north around the lower piling, then crossing above the relief gate and stepping down at the station. The save fixture now moves the player without changing authored spawn. The closure scenarios live in threefold-closure-simulation.test.js, separate from the existing long simulation suite; the repeated-action helper has complete JSDoc.

The signal station is authored as destructible geometry. At aftermath, its console files a report only while intact. The upland road closes the episode by departure even when the station is rubble. closedBy persists across save/export/import, legacy withdrawals migrate to departure, and validation rejects inconsistent reported closures.

## Evidence

- Six focused THREEFOLD suites: 106 tests passed.
- npm run build: passed.
- npm run check: passed all 10 local gates; 956 suites / 6,571 tests, zero clones, zero audit vulnerabilities.
- Matching GitHub Full Check and coverage report: pending on the pushed commit.

## Next-time guidance

When validating scale-growth geometry, trace the exact route through adjacent obstacles before asserting which structure is damaged. Keep authored spawn data stable in persistence tests and override only the live player position. Split newly added behavior into a focused suite before a large callback reaches the configured line limit.
