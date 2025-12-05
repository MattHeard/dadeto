# Container handler array

- **Unexpected hurdle:** Consolidating the repeated `maybeRemove*` calls into an array kept the logic compact but required ensuring every handler shared the `(container, dom)` signature.
- **Diagnosis & options considered:** I introduced `containerHandlers` inside `numberHandler` and looped over it instead of explicitly invoking each helper, making this cleanup list easier to extend later.
- **What I learned:** Arrays of same-signature functions pair well with `forEach` when you need to execute multiple side effects in order; just keep the dependencies aligned.
- **Follow-ups/open questions:** None—lint continues to pass.
