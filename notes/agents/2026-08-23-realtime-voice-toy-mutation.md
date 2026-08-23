# Realtime voice toy mutation follow-up

## Unexpected hurdle

The public toy API always supplies a non-empty local endpoint, so mutation of the local/cloud endpoint-error guard was initially behaviorally equivalent through end-to-end calls.

## Diagnosis and fix

The JSON parser already handles an absent input with its object fallback, making the function's empty-string default argument redundant. The endpoint error helper also had a guard whose false branch was not independently observable through the public API. Removed both equivalent constructs and exposed the existing helper through the test-only export for a direct local-empty contract assertion.

## Evidence

The authoritative scan for `src/core/browser/toys/2026-05-07/realtimeVoicePrototype.js` instrumented 36 mutants: 28 killed, 0 static-ignored, 0 non-static survivors, and 0 timeouts. Focused Jest passed 9 tests.
