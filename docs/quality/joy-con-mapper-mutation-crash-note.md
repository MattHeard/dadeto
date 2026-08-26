# Joy-Con mapper mutation-induced crashes

## Scope

The Joy-Con mapper lives in `src/core/browser/inputHandlers/joyConMapper.js`. Mutation testing for this browser input handler must treat mutation-induced exceptions as failures, not as ordinary surviving behavior. The risky areas include stored-state parsing and normalization, current-control synchronization, HID report decoding, capture transitions, and start/skip/reset lifecycle handlers.

## Failure pattern

A mutant can remove a guard, alter a nullish fallback, or change a state-transition condition. In the mapper, that can turn malformed storage, incomplete HID data, or an out-of-order lifecycle event into a thrown exception. These crashes are especially easy to miss when a test only checks the final DOM or prompt text; each relevant test should also prove that the handler remains callable and that the expected state transition completes without throwing.

## Test guidance

- Keep malformed, missing, and valid stored-state cases separate so Stryker selects the correct test for each branch.
- Exercise HID reports with missing, short, and valid payloads, and assert both the returned state and absence of an exception.
- Test capture start, update, completion, skip, reset, and disposal as independent transitions.
- Prefer helper-focused tests for decoding and normalization, plus lifecycle tests for the public handler.
- When a mutation causes a crash, record the mutated expression, input shape, and lifecycle phase in the focused test or agent note before rerunning the scan.

## Operational reference

The focused coverage command and remaining branch clusters are tracked in `notes/joycon-mapper-coverage.md` and `notes/agents/2026-03-31-joycon-mapper-remaining-coverage.md`.
