# Mutation scan: entrypoint-pattern

- Unexpected hurdle: five generated mutants had no coverage, while the remaining report contained ignored static pattern boundaries.
- Diagnosis: the focused suite exercised all observable pattern behavior; no mutant was reported as survived.
- Fix: no source or test change was needed; recorded the no-coverage and static-boundary evidence explicitly.
- Evidence: final scan reported 49 killed, 12 ignored, 5 no-coverage, 0 survivors, and 0 timeouts; 4 focused tests passed.
- Next-time guidance: distinguish Stryker `NoCoverage` from `Survived` and retain it as explicit follow-up evidence.
