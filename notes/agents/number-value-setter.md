# Number input setter helper

- **Unexpected hurdle:** Splitting out the value setter required a helper that only touched DOM APIs while still supporting the existing `setInputValue` call, so I didn't want to duplicate that line elsewhere.
- **Diagnosis & options considered:** Instead of inlining the setter in `createUpdateTextInputValue`, I kept the new helper purely responsible for `dom.setValue` and kept `setInputValue` adjacent in the closure, preserving behavior while satisfying the request.
- **What I learned:** This pattern makes it easier to reuse the DOM setter in the future without copying the event handler, but remember to keep helper responsibilities narrow.
- **Follow-ups/open questions:** None—lint passes and behavior unchanged.
