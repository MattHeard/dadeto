# Text handler cleanup

- **Unexpected hurdle:** Grouping the removal helpers into an array felt mechanical, but it kept the handler concise and ready for future additions.
- **Diagnosis & options considered:** Instead of leaving repeated calls, I created `containerHandlers` and iterated over it with the shared `(container, dom)` arguments so each cleanup helper runs in order.
- **What I learned:** Arrays of cleanup helpers streamline repeated calls when the arguments stay consistent; just make sure the function list stays small enough for readability.
- **Follow-ups/open questions:** None—lint is unaffected.
