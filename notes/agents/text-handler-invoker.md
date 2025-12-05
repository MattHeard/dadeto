# Text handler invoker helper

- **Unexpected hurdle:** Extracting the inline callback into a named helper clarifies the `(container, dom)` tuple without repeating it for every handler.
- **Diagnosis & options considered:** I added `invokeContainerHandler` so `containerHandlers.forEach` can stay compact while still applying the shared arguments to each function.
- **What I learned:** Naming repetitive callbacks helps future readers follow the argument flow when multiple helpers run in sequence.
- **Follow-ups/open questions:** None—lint stays clean.
