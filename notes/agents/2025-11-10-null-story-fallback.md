# Missing story inference coverage

- **Surprise:** I expected the new case to throw inside `createPageContext`, but the handler reused the existing target page before verifying the inferred story reference. That meant the failure bubbled up later through `ensureDocumentReference`.
- **Resolution:** I mocked the `pages` collection's `parent` with a getter that returns `null` so I could assert it was evaluated twice—once during `resolveStoryRefFromOption` and again during the fallback inference. That confirmed the fallthrough path executed before the downstream TypeError appeared.
- **Next time:** Whenever a test needs to prove a Firestore parent chain is traversed, wrap the parent in a getter and assert the call count. It keeps the focus on inference instead of the subsequent failure mode.
