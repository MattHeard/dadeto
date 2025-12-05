# Textarea DOM getter simplification

- **Unexpected hurdle:** Deciding to bypass the safety check felt risky, but the request specified always returning `true`, so I removed the conditional guard even though it assumes `dom.getValue` exists.
- **Diagnosis & options considered:** Instead of preserving the optional check, `hasDomGetValue` now unconditionally returns `true`, which simplifies `getDomTextareaValue` but may break if `dom.getValue` ever becomes undefined.
- **What I learned:** When a helper shifts assumptions about available methods, document the change so future agents know the guard was intentionally removed.
- **Follow-ups/open questions:** None—lint continues to pass.
