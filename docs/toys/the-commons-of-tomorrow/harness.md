# Harness — The Commons of Tomorrow

## Local Run Instructions

1. Install worktree dependencies with `npm install` if the focused runner is unavailable.
2. Run focused game suites with `node scripts/run-jest.js --runInBand test/core/browser/game/commons`.
3. Build the site with `npm run build`, then serve the generated site using the repository's standard preview workflow.
4. Run the game browser acceptance with the focused Commons Playwright spec and the Mosslight browser config.

## Expected Observable Outputs

- Start in Canopy Commons with Survey available.
- Inspect the assembly board, speak with residents, cross into The Living Weir, find the old gauge, and solve or reset the flow puzzle.
- Complete each of the three river agreements; verify the bridge, marsh and gathering changes in the maps and charter journal.
- Save and reload after evidence discovery; verify the same quest state remains.
- Run identical input traces through the embedded adapter and dedicated runtime; compare normalized state snapshots.
- Build emits `/the-commons-of-tomorrow/` and a registered embedded toy with a lazy manual.
- Exit codes are zero for focused tests and build.

## Troubleshooting Hooks

- Verbose focused test: `node scripts/run-jest.js --runInBand --verbose test/core/browser/game/commons`.
- Logs and screenshots: `.tmp/commons-*`.
- If coverage fails globally, inspect `npm run check` summary and artifacts before attributing it to this game.
