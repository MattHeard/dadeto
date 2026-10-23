# Agricultural Rover Failure Modes

## Initial Predicted Failure Classes
- Setup/configuration mismatch: missing node_modules or running commands outside the repository/worktree.
- Invalid or missing inputs: absent assumptions, unsupported job type, non-finite quantities, negative costs, zero coverage, or downtime at/above 100%.
- Dependency/service unavailable: none at runtime; the model is local and pure.
- Non-deterministic timing or ordering: no expected nondeterminism; scenario output order is fixed.
- Environment-specific behavior: sandbox process-spawn restrictions can prevent Node child processes; shared Beads lock can prevent recording evidence.

## Detection Signals
- Error signatures/log lines: `spawnSync ... EPERM`; `failed to acquire dolt access lock`.
- Observable symptoms: focused command cannot start a child process, or Beads cannot open the local Dolt database.
- Failing command(s): `npm run check:impact:run ...`; `bd show dadeto-krfo`.

## First-Response Playbook
1. Capture the exact failing command and output.
2. For process EPERM, rerun the same bounded evaluator with the approved elevated environment; do not change application code to work around sandboxing.
3. For Beads lock contention, inspect whether a Beads process is active and retry later; do not delete the lock or rebuild from the passive JSONL export.
4. Validate model behavior with Jest while keeping the loop open until Beads evidence is recorded.

## Promoted from Real Failures
- Date: 2026-10-23
- Failure observed: scoped impact evaluator reported ESLint warnings from formatting and incomplete parameter JSDoc; first run also showed missing branches in public invalid-input paths.
- Root cause: newly introduced source/tests did not yet match repository formatting and JSDoc rules, and invalid-path coverage was not exhaustive.
- Fix implemented: run ESLint autofix, document each parameter/return, and add invalid-scenario coverage for all public calculation entry points.
- Guardrail added (test/doc/harness): explicit focused evaluator command and public-boundary invalid-input test.
- Date: 2026-10-23
- Failure observed: Beads Dolt access lock remained busy with no live bd/Dolt process visible.
- Root cause: shared database lock state is external to this worktree and cannot safely be repaired from the passive export.
- Fix implemented: none; retain the existing Bead as owner and preserve the exact failure as an operational blocker.
- Guardrail added (test/doc/harness): do not remove the lock or reinitialize from stale JSONL; retry the canonical Bead before closure.
