# Call-with-target local alias

- **Unexpected hurdle:** Capturing the `applyWithTarget` result felt redundant until I realized assigning it to `callWithTarget` makes the `forEach` clearer and ready for reuse.
- **Diagnosis & options considered:** Instead of calling `applyWithTarget(targetValue)` inside every loop entry, I cache its return value and pass that single function to `forEach`, keeping the intent obvious.
- **What I learned:** Naming the cached factory result helps document that the same `(handler) => handler(textInput, targetValue)` function runs for every callback without repeating the argument list.
- **Follow-ups/open questions:** None—lint still passes so behavior is unchanged.
