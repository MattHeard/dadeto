# Simulator state factory extraction

- Unexpected hurdle: `bd` was not installed and the checked-out bead metadata had been migrated away from the tracked JSONL, so issue creation required installing `bd` and reinitializing local bead state.
- Diagnosis path: inspected `src/core/local/gcp-simulator/simulator.js`, identified `buildSimulatorState` as holding fixture seeding, snapshot, trigger matching, route, auth, and lookup helper declarations, then validated with an Acorn AST check for nested functions.
- Chosen fix: moved the nested helpers to top-level factory/helper functions that take explicit dependency bags (`db`, `fieldValue`, route deps, auth verifiers) and left `buildSimulatorState` as orchestration only.
- Next-time guidance: when refactoring this simulator, prefer dependency-object factories for helpers that need fake Firestore or route state so source inspection can prove the build function has no nested declarations. Full `npm test` currently has a cwd/path expectation outside this slice (`test/local/notionCodex.config.test.js`) in this workspace.
