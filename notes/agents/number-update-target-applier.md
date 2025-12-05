# Target-based handler applier

- **Unexpected hurdle:** The new requirement to abstract the handler invocation into an inner factory meant reconsidering the loop over `updateHandlers`, so I introduced `applyWithTarget` to keep the `forEach` call simple while still passing both `textInput` and the computed target value.
- **Diagnosis & options considered:** Instead of duplicating the `(textInput, targetValue)` call each time, the helper returns a function that closes over both the target value and the text input, preserving the existing event handler contract.
- **What I learned:** Small internal factories like this are helpful when the same pair of arguments needs to be threaded through several callbacks; keep their names descriptive so future readers know they’re part of the control flow.
- **Follow-ups/open questions:** None—lint remains clean, and behavior unchanged.
