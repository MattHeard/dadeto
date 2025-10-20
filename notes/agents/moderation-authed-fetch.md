# Moderation authed fetch refactor

## Challenges
- Aligning the authed fetch factory with both response-like stubs for unit tests and the browser adapter that pre-parses JSON required designing for flexible return types.

## Resolutions
- Built the factory to recognize response-shaped objects (with `ok` and `json`) while otherwise returning upstream values, enabling the adapter to return a response wrapper and the tests to simulate different scenarios.
