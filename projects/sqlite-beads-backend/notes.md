# SQLite Beads Backend

## Outcome

Switch the Beads working memory backend for both `~/.beads` and `~/dadeto/.beads` from Dolt to SQLite so we stop fighting Dolt’s locking model, simplify local tooling, and keep the planner state accessible without needing a running server.

## Priority

- MoSCoW: Must have for the planning surface because Dolt’s locking conflicts keep blocking `bd ready` and `bd update` calls in this workspace.
- RICE: High reach since it affects every bead operation and reduces the number of manual lock-fights across both bead databases.
- Cost of Delay: Very high. Each delay forces manual lock cleanup, interrupted launch loops, and repeated restarts of Symphony/Beads tooling.

## Current state

We already have most working memory exported to Dolt, but the locking model frequently rejects `bd ready`/`bd update` requests during heavy agent activity, forcing manual lock removal (`.beads/dolt-access.lock`). A working SQLite backend exists in the `bd` codebase but is not wired into this workspace yet, so every runner is subject to those Dolt access failures until the migration completes.

- Freshness check: reviewed on 2026-03-17 and still reflects the SQLite migration path and lock-failure motivation.

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
- Create a migration step that exports the Dolt issues JSONL and re-imports them into SQLite before switching the default backend.
- Add regression tests that run `bd ready`/`bd update` while holding locks to prove SQLite no longer times out.
- Document the new backend in workspace setup docs so future sessions know to expect SQLite.
- Decide whether any symphony-local processes need config tweaks to point at the new `.beads` backend.

## Tentative sequence

1. Update `bd` config to support an explicit backend switch via env vars or config files.
2. Write and run a migration script that copies the existing Dolt JSONL exports into the SQLite file and ensures indexes are correct.
3. Point both `~/.beads` and `~/dadeto/.beads` at SQLite, restart Symphony/Beads, and run `bd ready`/`bd update` to confirm locks disappear.
4. Add documentation describing how to recover/rerun the migration if the db becomes corrupted.
5. Consider removing Dolt-specific tooling once SQLite is proven stable.

## First database migration slice (~/dadeto/.beads)

- Built a clean SQLite skeleton by running `bd init --backend sqlite` in an empty workspace and copying the generated `.beads/beads.db` into this repo. This gives the correct schema without needing to reverse-engineer the internal tables.
- Re-specified `.beads/metadata.json` to point at the new SQLite backend and kept the existing `.beads/dolt` tree around as a fallback in case we need to roll back.
- Added the custom type `subtask` (`bd config set types.custom "subtask"`) before importing because the gm/mh issues rely on that label.
- The JSONL import had to be split by prefix to satisfy the prefix guard: for each prefix (`gm`, `mh`, `dadeto`) we set the database `issue_prefix` (both via `bd config set issue-prefix` and by writing to the `config` table’s `issue_prefix` row) and ran `bd import -i <prefix>.jsonl`. This kept the original IDs intact while avoiding the `prefix mismatch` rejection.
- Importing the mh slice triggered four warnings about missing dependencies (mh-007 → dadeto-007, mh-8kp → dadeto-8kp, mh-nmo → dadeto-nmo, mh-D60 → mh-vwf) plus the `mh-D60` cycle warning; those edges should be repaired after the gm/dadeto siblings exist. gm and dadeto slices imported cleanly.
- Verified success with `bd backend show` (now reports SQLite) and `bd ready --sort priority` (the same queue of 10 ready beads remained accessible).

## Migration plan for the second database (~/.beads)

1. Back up the existing Dolt tree (`mv ~/.beads/dolt ~/.beads/dolt.bak && mv ~/.beads/beads.db ~/.beads/beads.db.bak` if they exist) and run `bd init --backend sqlite` in a throwaway directory to generate another template SQLite file.
2. Copy that template into `~/.beads/beads.db`, update `~/.beads/metadata.json` to mirror the repo version (backend = `sqlite`, database = `beads.db`, jsonl_export = `issues.jsonl`), and keep the Dolt data around until the migration is fully verified.
3. Mirror the prefix-handling steps above: split `~/.beads/issues.jsonl` by prefix (e.g., the Python snippet used during this loop) so you can run `bd config set issue-prefix gm` before importing the gm shard, then update the SQLite `config` table’s `issue_prefix` row to the same prefix. Repeat for `mh` and `dadeto`, adding `subtask` to `types.custom` before the mh import and noting the same dependency warnings for later cleanup.
4. Import each shard with `bd import -i <shard>` (import order: gm, mh, dadeto), keeping an eye on `bd import`’s warning list and repairing references afterwards.
5. After the import, run `bd backend show` and `bd ready --sort priority` from a clean shell to prove the global database now reports SQLite and can answer the same ready queue before removing the old `.beads/dolt` tree.

## Prefix-split import helper

- Script: [`scripts/beads-prefix-split-import.js`](../../scripts/beads-prefix-split-import.js)
- Dry run:

```bash
node scripts/beads-prefix-split-import.js --root ~/.beads --dry-run
```

- Apply:

```bash
node scripts/beads-prefix-split-import.js --root ~/.beads --apply
```

- The script backs up `~/.beads` to `~/.beads.bak`, splits `issues.jsonl` into `gm.jsonl`, `mh.jsonl`, and `dadeto.jsonl`, sets `types.custom=subtask` once, then runs `bd config set issue-prefix <prefix>` and `bd import -i <shard>` in prefix order.
- If `bd` still needs the SQLite config row updated manually in a specific environment, write the same prefix to the `config.issue_prefix` row before each import and keep the script output as the shard list to follow.
- Confirm the cutover with `bd backend show` and `bd ready --sort priority`.

## Verification snapshot (2026-03-15)

- The repo `.beads/metadata.json` already matches the documented template (backend `sqlite`, `database` `beads.db`, `jsonl_export` `issues.jsonl`), so copying that file into `~/.beads` still creates the right target configuration for the migration.
- Running `bd backend show` now reports `Current backend: sqlite` with the database `/home/matt/dadeto/.beads/beads.db`, proving the CLI still exposes the same information that operators can read after each migration pass.
- `bd config get issue-prefix` returns `gm` and `bd config get types.custom` returns `subtask`, confirming that the prefix toggling and the extra issue type that drove the first migration still exist in this workspace and can be set via `bd config` before each shard import.
- The remaining dependency warnings (mh referencing dadeto) described in the first collection are still expected because the import order is unchanged, so the same manual verification of mh–dadeto relationships will be required after running the gm/mh/dadeto imports for `~/.beads`.
