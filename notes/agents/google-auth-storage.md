## Google Auth storage guard

- Unexpected: extracting the session-storage remove helper to a shared factory initially broke the `signOut` test because the adapter held a stale / mocked `sessionStorage` reference; restoring the getter to run against `globalThis.sessionStorage` each time (and later moving it into `createSessionStorageHandler`) kept the adapter in sync with Jest’s globals.
- Diagnosis: the test failure was obvious once `signOut` stopped clearing `id_token`, and replaying `npm test` confirmed the guard was the culprit after the initial refactor—refactoring away the inline guard before running the suite reproduced the failure.
- Lesson: wrappers over browser globals should almost always re-read the resource rather than capturing it at module load, especially when tests may replace `window`/`sessionStorage`; centralizing the lazy validator in `admin-core` makes it easy to reuse while still failing fast when the API isn’t present.
- Follow-up idea: if we ever need to support other storage targets (localStorage, fallback polyfills), keep `createSessionStorageHandler` generic enough to accept a storage name or allow injectable loggers for failed removals.
