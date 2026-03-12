Unexpected hurdle: the existing tests already touched `parseHiLoInput` enough to cover invalid JSON, but the branch guarding `normalizeParsedEvent` against non-object payloads remained untouched; nothing in the suite had ever fed a scalar even though the guard is reachable from `parseJsonObject`.

Diagnosis path: inspected `reports/coverage/coverage-final.json` and saw branch `3` (the `isObjectValue` guard inside `normalizeParsedEvent`) had `[0,8]` hits, so I traced the call graph and realized sending JSON that parses to a primitive would run into that branch without touching the exported helper directly.

Chosen fix: added a `parseHiLoInput('"scalar"')` test to force `parseJsonObject` to return a truthy primitive, letting `normalizeParsedEvent` hit the `return null` path and closing that branch gap while keeping the change scoped to the toy tests.

Next-time guidance: when analyzing branch gaps for these toys, start by checking `reports/coverage/coverage-final.json` for zero-hit branch ids and ensure there is at least one scalar or non-object fixture covering each guard before rerunning `npm test`.
