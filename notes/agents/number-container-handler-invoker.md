# Container handler invoker

- **Unexpected hurdle:** Pulling the `forEach` callback into its own variable helped clarify that the same `(container, dom)` arguments are applied to every cleanup helper without repeating the tuple inside the loop.
- **Diagnosis & options considered:** Instead of keeping the inline arrow, I introduced `invokeContainerHandler` so the iterator simply references that helper, making the loop body extremely concise.
- **What I learned:** Named callbacks in repeated loops improve readability when the arguments are more complex than a single value.
- **Follow-ups/open questions:** None—lint still passes.
