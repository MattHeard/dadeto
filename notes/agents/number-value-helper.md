# Number input value helper

- **Unexpected hurdle:** The setup originally inlined the truthy check before setting the input value, so I introduced `maybeSetNumberInputValue` to keep `createNumberInput` declarative without duplicating the guard.
- **Diagnosis & options considered:** Instead of reusing a generic setter, the new helper makes the guard explicit, so future tweaks to default values live in one place.
- **What I learned:** Small helper functions can cleanly express conditional DOM mutations while keeping the parent factory focused on orchestration rather than edge cases.
- **Follow-ups/open questions:** None—lint passes and behavior stays the same.
