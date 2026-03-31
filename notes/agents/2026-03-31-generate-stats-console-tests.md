## Hurdle

Replacing `console` defaults in the generate-stats tests exposed one logger-behavior assertion that still depended on the previous real-console wiring.

## Diagnosis

The test was creating a spy but still passing a noop logger into `createGenerateStatsCore()`, so the assertion never saw a call.

## Fix

Switched the assertion test to inject `{ error: consoleSpy }` directly, while leaving the other test cases on a noop logger.

## Next Time

When replacing environment defaults in tests, check that the spy or stub being asserted is the same object actually passed into the system under test.
