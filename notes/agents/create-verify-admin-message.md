## Create Verify Admin Message

- **Unexpected hurdle:** The admin guard exposed a `missingTokenMessage` dependency that clients were not using, so removing it required updating both the core implementation and several tests that stubbed the old contract.
- **Diagnosis:** After inlining the default missing-token text and always deferring invalid-token responses to `defaultInvalidTokenMessage`, the helper now owns both message paths, so callers don’t have to configure any extra strings and the failing Jest test was just exercising unused options.
- **Action:** Dropped the optional argument and adjusted the tests to rely on the built-in `'Missing token'` and `defaultInvalidTokenMessage` responses, keeping the guard contract simpler.
- **Learned:** When a dependency is unused by production code, removing it reduces API surface and test maintenance.
- **Follow-up:** No follow-up items.
