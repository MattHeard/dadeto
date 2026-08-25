# Pricing core mutation scan

- Unexpected hurdle: unit-rate fixtures allowed a division/multiplication mutant to survive, and defensive validation mutations produced runtime errors in constructor paths.
- Diagnosis: a non-unit credit rate exposed the arithmetic defect; direct validator assertions and an isolated invalid-rate fixture covered the intended input contract.
- Fix: added non-unit rounding and validation assertions, separated the positive-integer checks, and documented the narrow defensive validation boundary. The final scan reported 31 killed, 19 ignored, 4 static runtime errors, 0 survivors, and 0 timeouts.
- Next time: include non-unit fixed-point rates and isolated invalid fixtures in pricing tests from the start.
