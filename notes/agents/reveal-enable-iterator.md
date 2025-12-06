## Reveal/Enable Iteration

- **Outcome:** `revealAndEnable` in `src/core/browser/inputHandlers/browserInputHandlersCore.js` now collects the `dom.reveal` and `dom.enable` helpers into a local `actions` array and iterates with `forEach`, invoking each via `action.call(dom, element)` so the handlers stay shareable while preserving their `dom` context.
- **Unexpected hurdles & options considered:** None—switching to `.forEach` kept the change small, and binding ensures the methods still see the expected `dom`.
- **Lessons & follow-up ideas:** When refactoring similar helper loops, consider `call`/`apply` to guard against context loss whenever DOM helpers live on the object.
- **Open questions:** None.
