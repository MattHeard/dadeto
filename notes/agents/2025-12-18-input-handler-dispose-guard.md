After the previous refactor centralizing cleanup helpers I ran `npm test` and saw every suite for `kvHandler`, `numberHandler`, `textHandler`, and `defaultHandler` fail: they all expected the widget removal helpers to skip removing elements that never exposed `_dispose`. In moving the logic into `browserInputHandlersCore` I had removed that guard, so the new `applyCleanupHandlers` was always calling `dom.removeChild` even when the helper had never been told to dispose anything.

I could have tried to add the guard back in each handler, but that would defeat the point of centralized cleanup. Instead I added a shared `hasDisposeHook` check inside `removeCapturedElement` so `dom.removeChild` only runs when the element actually registered `_dispose`, matching the prior behavior while keeping the common helper intact.

Next time a DOM helper is moved or shared, I should double-check whether the prior behavior was conditional on some instrumentation (like `_dispose`) before refactoring. A regression test that exercises the cleanup helper directly would surface this sooner.

Open question: Should we add an explicit unit test around `removeCapturedElement`/`applyCleanupHandlers` to ensure the `_dispose` guard is enforced for any future refactors?
