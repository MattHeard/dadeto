## Create Verify Admin Message

- **Unexpected hurdle:** The admin guard exposed a `missingTokenMessage` dependency that clients were not using, so removing it required updating both the core implementation and several tests that stubbed the old contract.
- **Diagnosis:** After inlining the default missing-token text, the helper now always sends `defaultMissingTokenMessage` directly, so there is no need for consumers to supply the property; the failing Jest test was just exercising the old option.
- **Action:** Dropped the optional argument and adjusted the tests to rely on the built-in `'Missing token'` response, keeping the guard contract simpler.
- **Learned:** When a dependency is unused by production code, removing it reduces API surface and test maintenance.
- **Follow-up:** No follow-up items.
