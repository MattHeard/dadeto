# Textarea selector locality

- **Unexpected hurdle:** Moving the selector out of the shared constants felt redundant but keeps this handler decoupled from the global module.
- **Diagnosis & options considered:** Instead of importing `TEXTAREA_SELECTOR`, I defined it locally as `'.toy-textarea'` so the handler owns both the selector and class name derivation.
- **What I learned:** When a constant is only consumed by one module, keeping it local can simplify dependency tracking; just watch for drift if other files still rely on the global export.
- **Follow-ups/open questions:** None—lint continues to pass.
