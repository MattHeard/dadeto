# SQLite Beads Backend

## Outcome

Switch the Beads working memory backend for both `~/.beads` and `~/dadeto/.beads` from Dolt to SQLite so we stop fighting Dolt’s locking model, simplify local tooling, and keep the planner state accessible without needing a running server.

## Priority

- MoSCoW: Must have for the planning surface because Dolt’s locking conflicts keep blocking `bd ready` and `bd update` calls in this workspace.
- RICE: High reach since it affects every bead operation and reduces the number of manual lock-fights across both bead databases.
- Cost of Delay: Very high. Each delay forces manual lock cleanup, interrupted launch loops, and repeated restarts of Symphony/Beads tooling.

## Current state

We already have most working memory exported to Dolt, but the locking model frequently rejects `bd ready`/`bd update` requests during heavy agent activity, forcing manual lock removal (`.beads/dolt-access.lock`). A working SQLite backend exists in the `bd` codebase but is not wired into this workspace yet, so every runner is subject to those Dolt access failures until the migration completes.

## Constraints

- Keep the user-visible `bd` commands unchanged; the chunked output should remain the same once the backend switch is done.
- Ensure both `~/.beads` and `~/dadeto/.beads` get upgraded without data loss; the existing Dolt state must be re-exported or migrated into SQLite to preserve continuity.
- Keep the migration bounded: install wiring/config, verify SQLite backend works via unit tests, and avoid touching unrelated project files.

## Open questions

- Should we keep both backends in-place after the migration (e.g., fall back to Dolt if SQLite fails) or fully deprecate Dolt in this workspace?
- What migration steps are required to move `~/.beads` data from Dolt to SQLite without losing existing issue metadata?
- Which Teams/Docs references need updates to describe the new backend expectation?
- Does the workspace need a bootstrap script to reinitialize SQLite after it is added?

## Candidate next actions

- Wire `bd` to configure SQLite for both bead databases and add the necessary config snippet to shared dotfiles.
- Create a migration bead that exports the Dolt issues JSONL and re-imports them into SQLite before switching the default backend.
- Add regression tests that run `bd ready`/`bd update` while holding locks to prove SQLite no longer times out.
- Document the new backend in workspace setup docs so future sessions know to expect SQLite.
- Decide whether any symphony-local processes need config tweaks to point at the new `.beads` backend.

## Tentative sequence

1. Update `bd` config to support an explicit backend switch via env vars or config files.
2. Write and run a migration script that copies the existing Dolt JSONL exports into the SQLite file and ensures indexes are correct.
3. Point both `~/.beads` and `~/dadeto/.beads` at SQLite, restart Symphony/Beads, and run `bd ready`/`bd update` to confirm locks disappear.
4. Add documentation describing how to recover/rerun the migration if the db becomes corrupted.
5. Consider removing Dolt-specific tooling once SQLite is proven stable.
