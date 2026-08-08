# Hide variant HTML core coverage

- Unexpected hurdle: the existing deletion/removal suites left only low-level Firestore reference-chain and page-snapshot guards uncovered.
- Diagnosis: those helpers were already exposed through the module's test utilities, so no end-to-end trigger setup was needed for the final branches.
- Fix: added valid/invalid parent-chain cases and existing/missing page snapshot payload cases.
- Next-time guidance: inspect exported test utilities before building additional integration fixtures for defensive helper branches.
