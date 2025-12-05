# Container handler invoker factory

- **Unexpected hurdle:** Turning the inline invoker into a helper felt redundant at first, but it makes `numberHandler` easier to read and the repeated `(container, dom)` tuple is centralized.
- **Diagnosis & options considered:** I created `createContainerHandlerInvoker` that returns the `handler => handler(container, dom)` function so the loop just reuses the pre-bound invoker.
- **What I learned:** When multiple helpers need the same contextual arguments, building a tiny factory upfront keeps loops clean and avoids repeating the closure arguments.
- **Follow-ups/open questions:** None—lint stays green.
