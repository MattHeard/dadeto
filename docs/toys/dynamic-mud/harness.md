# Dynamic MUD Harness

## Local Run Instructions
1. Install prerequisites with `npm install` if dependencies are absent.
2. No external service or credentials are required; test fixtures are inline.
3. Run `npm run test:impact -- --files test/core/browser/game/dynamicMud.test.js test/core/browser/game/dynamicMud-game.test.js test/core/browser/game/dynamicMud-page.test.js test/core/browser/game/dynamicMud-unknownCommandRuntime.test.js`, then `npm run check`.
4. Run `npm run build` and open `/dynamic-mud/` to play the Rain Causeway scene. The browser adapter wires proposal and builder providers to the existing billed OpenAI Chat endpoint. The generated static config exposes this only when both billing and chat are enabled; leave both off for local and automated tests.

## Expected Observable Outputs
- Terminal output should show the four related Jest suites passing and the check runner reporting success.
- The safety-pipeline suite proves generated commands are validated and dry-run before registration; tests use deterministic fake providers and make no network or model calls.
- `test/browser/dynamic-mud.test.js` exercises the browser provider adapter with mocked HTTP responses. Verify the `AllowEffects` capability reaches both requests, known commands bypass config/auth/provider work, a disabled public gate makes no chat request, malformed model JSON leaves the world and registry unchanged, and idempotency keys are sent for both stages.
- One unfamiliar command makes two independently credit-billed chat requests when enabled: one for the predicted result and one for the DSL program. The page displays a credit notice. Never enable the flags or run a live request as part of local tests.
- Artifacts written to: ignored reports emitted by the check runner.
- Exit code: `0` for each accepted command.

## Troubleshooting Hooks
- Verbose mode command: `npx jest --runInBand --verbose test/core/browser/game/dynamicMud.test.js test/core/browser/game/dynamicMud-game.test.js test/core/browser/game/dynamicMud-page.test.js test/core/browser/game/dynamicMud-unknownCommandRuntime.test.js`.
- Log location: direct terminal output and the Bead comment.
- Cleanup command: no persistent state is created.
