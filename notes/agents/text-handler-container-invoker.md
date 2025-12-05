# Container handler invoker factory (text)

- **Unexpected hurdle:** The extractor previously lived inline but the request to create an explicit factory helped highlight how the `(container, dom)` pair is reused across each handler.
- **Diagnosis & options considered:** I introduced `createContainerHandlerInvoker` so the text-specific cleanup handlers gain a pre-bound invoker, keeping `textHandler` concise.
- **What I learned:** Tiny factories are useful when multiple functions share a common argument tuple; they let you cache the closure once and keep loops declarative.
- **Follow-ups/open questions:** None—lint remains clean.
