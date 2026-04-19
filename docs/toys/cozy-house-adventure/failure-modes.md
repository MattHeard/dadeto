# Cozy House Adventure Failure Modes

## Initial Predicted Failure Classes
- Setup/configuration mismatch:
  - Missing env dependencies (`getData`, `setLocalTemporaryData`, etc.).
- Invalid or missing inputs:
  - Player enters unrelated text while in a stage and cannot progress.
- Dependency/service unavailable:
  - Not applicable (no network/service calls).
- Non-deterministic timing or ordering:
  - Random flavor line can appear/disappear based on `getRandomNumber`.
- Environment-specific behavior:
  - Time stamp string format varies by `getCurrentTime` provider.

## Detection Signals
- Error signatures/log lines:
  - `SYSTEM ERROR: fireplace smoke in the command line`.
- Observable symptoms:
  - Toy repeatedly prompts for command and never advances.
- Failing command(s):
  - `npm test -- --watchman=false --runInBand test/toys/2026-04-19/cozyHouseAdventure.test.js`

## First-Response Playbook
1. Confirm state writes under `temporary.COZY1` include `name`, `state`, `inventory`, and `progress`.
2. Re-run targeted toy tests and inspect expected command prompts for each stage.
3. If dependency lookup fails, validate env map keys against required names.

## Promoted from Real Failures
- Date: 2026-04-19
- Failure observed: None during initial implementation loop.
- Root cause: N/A.
- Fix implemented: N/A.
- Guardrail added (test/doc/harness): Added focused Jest suite for start/build/completion/error paths.
