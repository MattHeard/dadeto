# Target applier factory

- **Unexpected hurdle:** Splitting the `applyWithTarget` logic into a reusable factory meant thinking about where to place the new helper so it could be shared without leaking DOM details.
- **Diagnosis & options considered:** Instead of repeating the closure inside `createUpdateTextInputValue`, I introduced `createTargetApplier` that takes `textInput` and returns the former `applyWithTarget`, keeping the signature clean and easy to test in isolation.
- **What I learned:** Pull helper factories out when they only depend on a subset of parameters; it improves readability and lets callers express dependencies more declaratively.
- **Follow-ups/open questions:** None—lint still passes and behavior is unchanged.
