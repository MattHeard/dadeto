# dadeto-a1c7 Runner Loop

- Unexpected hurdle: the `guessKey` string guard looked dead under normal inputs.
- Diagnosis path: traced `parseHiLoInput` -> `normalizeParsedEvent` -> `applyHiLoEvent` and checked how `key` is read twice during a single event path.
- Chosen fix: added a characterization test that uses a `key` getter returning a string on first read and a non-string on second read, proving the guard is reachable.
- Next time: if a branch looks unreachable, check for accessor or proxy-shaped runtime inputs before widening scope.
