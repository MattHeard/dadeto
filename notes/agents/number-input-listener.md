# Input listener extractor

- **Unexpected hurdle:** Pulling the DOM event wiring into `addInputListener` required deciding whether to pass the `'input'` literal through multiple layers or hard-code it here.
- **Diagnosis & options considered:** Creating the helper keeps `setupInputEvents` focused on orchestrating listener registration and disposal while centralizing the DOM API call.
- **What I learned:** Even a singular DOM call becomes clearer when extracted—names like `addInputListener` reveal intent and simplify future event changes.
- **Follow-ups/open questions:** None—lint keeps passing.
