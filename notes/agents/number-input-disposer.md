# Input disposer extractor

- **Unexpected hurdle:** Pulling out the disposer factory required deciding how much context to close over while keeping the `createRemoveListener` call readable.
- **Diagnosis & options considered:** I created `createInputDisposer(dom, input, onChange)` so `setupInputEvents` just wires the event and assigns the returned disposer, keeping the event lifecycle logic in one place.
- **What I learned:** Encapsulating the `createRemoveListener` options clarifies the setup function and makes it easier to test the disposer independently if needed.
- **Follow-ups/open questions:** None—lint still passes and behavior is unchanged.
