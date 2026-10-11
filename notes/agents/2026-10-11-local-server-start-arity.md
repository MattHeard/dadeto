# Local server start arity cleanup

- Unexpected hurdle: `startServer` combined URL preparation, startup logging, and the `server.listen` overload decision in one options-bag function.
- Diagnosis: the callback behavior and listener registration are separate responsibilities. The writer URL is available before listening, while both startup messages must wait for the listening callback.
- Fix: moved URL lookup and callback construction to the runtime composition, gave the callback builder four explicit values, and kept `startServer` focused on selecting the correct `listen` signature.
- Next time: keep server callback construction separate from the method call so tests can continue to verify callback timing and `this` binding. Next global finding: `src/core/local/server.js:525` (effective arity 5).
