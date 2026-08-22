# Realtime voice presenter mutation follow-up

- Unexpected hurdle: the presenter initially exposed 114 surviving mutants and several mutation-induced cleanup crashes because the existing suite exercised only five broad scenarios.
- Diagnosis path: ran the core presenter with its browser wrapper included in Stryker's file set, then inspected the JSON report by mutant location rather than relying on progress output.
- Chosen fix: exported focused test-only helpers, added exact DOM/WebRTC/SDP/parser/resource assertions, removed equivalent parser guards, and scoped only malformed JSON and the fixed initial status invariant as static boundaries.
- Evidence: final scan instrumented 195 mutants; 182 killed, 13 static-ignored, 0 non-static survivors, and 0 timeouts. Focused Jest passed 9 tests.
- Next-time guidance: include imported browser wrappers in the Stryker file set and inspect the final JSON report; broad lifecycle tests alone left diagnostic and defensive branches unprotected.
