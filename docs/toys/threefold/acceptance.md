# THREEFOLD Acceptance

## Machine-Checkable Criteria

- [ ] Focused runtime Jest suite passes for movement, scale controls, deliberate wait, save/reload, reset, and invalid imports.
- [ ] `npm run build` exits 0 and produces `public/threefold/index.html`, `public/threefold/game.js`, and `public/core/browser/game/threefold/runtime.js`.
- [ ] The standalone HTML declares a 160 × 144 canvas and all mapped handheld controls.
- [ ] `npm run check` exits 0 with all 10 gates passing, 100% lines/statements/functions/branches, and zero clones.
- [ ] `docs/toys/threefold/spec.md`, `harness.md`, `acceptance.md`, `failure-modes.md`, and `manual.md` describe the same implemented control contract.

## Evidence Collection

- Command log path: `.tmp/threefold-check.log`.
- Generated page: `public/threefold/`.
- Coverage report: `reports/coverage/coverage-summary.json`.
- Test report: `.tmp/threefold-check.log` includes the shard results and final check summary.

## Pass/Fail Rules

Pass only when every machine-checkable criterion is verified, the user can reach the standalone page, and game actions never use browser wall-clock time. Fail if save/reload loses player or crisis state, or if the frame/control documentation disagrees with runtime behavior.
