# Neon living lab: personnel migration seam

Owner: dadeto-88mh. This is an implementation checkpoint, not completion of Release 1 or the four-release goal.

The shared save adapter previously validated game-specific state before any migration. Neon now supplies an optional migration hook while the envelope stays at version 2. Migrations return the original object for current or malformed ledgers; only a changed, subsequently validated state receives an exact original backup. This avoids repairing corrupt current rosters or losing a historical campaign.

Named roster accounting is strict at import, but compatibility totals remain available to existing economic rules. Personnel orders select the actual employee; anonymous donor commands are rejected without charging attention. Six authored hires and contextual concerns are reachable through the real controller menus.

Reset without a receipt is still an explicit reset. The runtime passes a separate reset indicator to the adapter so migration backups are cleared even in that path. Do not overload an idempotency receipt to infer destructive intent.

Real browser acceptance exposed a second reset route: the controller menu resolves reset internally rather than invoking the public reset method. That route must also pass the reset indicator. Cover both methods with the persistent adapter; a spy that only checks a new-game state will miss stale backup retention. Browser migration fixtures must populate storage via an initialization script before the runtime starts, not while live autosaving can overwrite them.

On this host `/tmp` was full. Use `TMPDIR=/home/matt/dadeto/.tmp/neon-runtime` for evaluators rather than deleting other processes' temporary data. Focused evidence: `.tmp/neon-personnel-tests.log`, `.tmp/neon-personnel-coverage/`, `.tmp/neon-personnel-tsdoc.log`, `.tmp/neon-personnel-duplication.log`. Browser and aggregate evidence are retained in the owning bead as they finish.

Next bounded slice remains the playable clinic/cooling introduction and deterministic explanatory settlement forecast, followed by warning/intervention/incident/recovery chains. Rules version 1 is a personnel schema checkpoint; bump and migrate it when later releases add required persistent fields. Preserve original backups across every subsequent schema transition.

The aggregate gate failed at the first serial coverage shard with a V8 heap abort at both shard sizes 40 and 20. The hard-coded 256 MB worker limit was insufficient for the analyzer/browser workload. Raise that bounded serial limit to 512 MB (host approximately 2.3 GB available at diagnosis), retain shard isolation and every exact coverage threshold. Track this environment/evaluator evidence in existing dadeto-zflf as well as dadeto-88mh. A final static-only summary is not success if the preceding test-phase summary failed; inspect both and the command exit code.

Publication preflight found Netlify's production workflow still pinned Node 20 while `scripts/check-node-version.js` rejects every version below 22. Align that workflow with Node 22 before pushing a source checkpoint; otherwise the source-triggered build cannot publish this game. The local build already succeeds on the supported Node runtime.

## Terminal checkpoint evidence

- `TMPDIR=/home/matt/dadeto/.tmp/neon-runtime DADETO_COVERAGE_SHARD_SIZE=40 npm run check` exited 0 after the worker-limit correction: `.tmp/neon-personnel-full-check-512.log`. Both summaries pass: test 1/1 and remaining gates 10/10. All 21 unit shards and nine aggregate browser cases pass.
- `reports/coverage/coverage-summary.json`: lines 20461/20461, statements 21331/21331, functions 7113/7113, branches 10296/10296, all exactly 100%, no skipped source coverage.
- Strict duplication remains zero; no threshold, exemption or ignore changes. Final source-specific artifact: `.tmp/neon-personnel-final-duplication.log`.
- Focused shared-game acceptance passes 162 tests with 100% on affected modules: `.tmp/neon-checkpoint-tests.log` and `.tmp/neon-checkpoint-coverage/coverage-final.json`.
- Neon local phone/desktop Playwright passes all ten journeys: `.tmp/neon-personnel-browser-final.log`. Expanded shared-game browser acceptance passes 19 with three existing device-inapplicable skips: `.tmp/neon-shared-browser-regressions.log`.
- Site and cloud packaging pass: `.tmp/neon-personnel-build-final.log` and `.tmp/neon-personnel-cloud-build.log`.

Implementation commit: `5241970456`. Publication was not verified: the documented GitHub App key path is absent on this host. The user indicated the home directory, but bounded filename checks including hidden folders did not find it. Request the exact key path, never the key contents; do not silently substitute the available MattHeard OAuth/SSH identity. The four-release goal and dadeto-88mh remain active. Do not present this personnel checkpoint as a completed release or published game.
