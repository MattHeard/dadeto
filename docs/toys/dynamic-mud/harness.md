# Dynamic MUD Harness

## Local Run Instructions
1. Install prerequisites with `npm install` if dependencies are absent.
2. No external service or credentials are required; test fixtures are inline.
3. Run `npm run test:impact -- --files test/core/browser/game/dynamicMud.test.js test/core/browser/game/dynamicMud-game.test.js test/core/browser/game/dynamicMud-page.test.js test/core/browser/game/dynamicMud-unknownCommandRuntime.test.js`, then `npm run check`.
4. Run `npm run build` and open `/dynamic-mud/` to play the Rain Causeway scene. Unknown-command generation is available only when both providers are injected; the page currently runs known commands without a provider.

## Expected Observable Outputs
- Terminal output should show the four related Jest suites passing and the check runner reporting success.
- The safety-pipeline suite proves generated commands are validated and dry-run before registration; tests use deterministic fake providers and make no network or model calls.
- Artifacts written to: ignored reports emitted by the check runner.
- Exit code: `0` for each accepted command.

## Troubleshooting Hooks
- Verbose mode command: `npx jest --runInBand --verbose test/core/browser/game/dynamicMud.test.js test/core/browser/game/dynamicMud-game.test.js test/core/browser/game/dynamicMud-page.test.js test/core/browser/game/dynamicMud-unknownCommandRuntime.test.js`.
- Log location: direct terminal output and the Bead comment.
- Cleanup command: no persistent state is created.
