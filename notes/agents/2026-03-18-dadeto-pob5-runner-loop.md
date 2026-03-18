# dadeto-pob5 runner loop (2026-03-18)
- unexpected hurdle: the parsed-payload guard in `hiLoCardGame.js` was not reachable through `parseHiLoInput()` because `parseJsonObject()` already collapses non-object JSON to `null`.
- diagnosis path: traced `parseHiLoInput()` -> `parseInputPayload()` -> `normalizeParsedEvent()` and confirmed the guard at line 105 only fires with a direct non-object call.
- chosen fix: exported `normalizeParsedEvent()` and added one characterization test that calls it with `null` and expects `null`.
- next-time guidance: if branch coverage still matters here, target the remaining uncovered branch in `hiLoCardGame.js` rather than re-testing the already-characterized guard.
