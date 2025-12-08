## Unexpected insights
- Number and textarea handlers both computed the position of their special inputs and wired identical input listeners, yet each reimplemented those concerns. Pulling the event attachment + disposer wiring and the “insert before the next sibling” logic into `browserInputHandlersCore.js` reduced that duplication.
- The DOM helper abstraction used across browsers does not always include `insertBefore` (the Jest stubs wielded in the failing suites lacked it), so I guarded the shared helper with a fallback to the native `parent.insertBefore`. That almost slipped past me during the first test run when the new helper blew up.
- Running `npm run lint` and `npm test` after the refactor kept confidence high and surfaced the missing DOM method immediately.

## Follow-ups
- The new helpers could likely serve other handlers such as KV or dendrite widgets later on—worth scanning them for the same patterns before future refactors.
