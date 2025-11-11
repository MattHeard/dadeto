# Guarding against missing story references in page creation

- **What happened:** While adding coverage for option submissions that generate a fresh page, I hit the guard that verifies the story reference exposes `collection`. The helper chain returns `null` when the page hierarchy lacks a reusable story parent, so the handler now rejects with a `TypeError`.
- **Investigation:** I traced `resolveStoryRefFromOption` to confirm it pulls `parent.parent` at each level. By stubbing the page parent to `{ parent: null }`, `createPageContext` received a `null` storyRef, reproducing the production failure the guard is meant to catch.
- **Takeaway:** When composing Firestore reference trees in tests, always set both `parent` levels. Missing one silently produces `null`, causing guards like `ensureDocumentReference` to throw. Model the hierarchy explicitly whenever you expect the handler to create new documents.
