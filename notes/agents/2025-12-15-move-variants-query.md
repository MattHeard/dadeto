# Move createVariantsQuery to core

- **Challenge:** Shifting `createVariantsQuery` out of the GCF wiring risked import loops and missing coverage for the new shared helper.
- **Resolution:** Imported the helper through the existing core re-export to avoid circular dependencies and expanded the core test suite to exercise the Firestore collection-group wiring.
