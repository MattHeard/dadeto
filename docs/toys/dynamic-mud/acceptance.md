# Dynamic MUD Acceptance

## Machine-Checkable Criteria
- [ ] `npx jest --runInBand test/core/browser/game/dynamicMud.test.js` exits 0.
- [ ] `npm run check` exits 0.
- [ ] `npm run manuals:check` exits 0.
- [ ] `git diff --check` exits 0.
- [ ] `npm run check` changed-core coverage reports 100% statements, branches, functions, and lines for the new core module.

## Evidence Collection
- Command log path: Bead `dadeto-vqic` comment and CI run for the commit.
- Generated artifacts: Jest and check output under ignored `reports/` paths.
- Test report path: `reports/check/` as emitted by the repository check runner.

## Pass/Fail Rules
Pass only when every command succeeds, all four changed-core coverage metrics are 100%, and the Bead records exact commands/results. This acceptance covers the safe core vertical slice only, not end-to-end gameplay or model-generated novel commands.
