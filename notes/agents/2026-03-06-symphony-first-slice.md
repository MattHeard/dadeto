## Dadeto-local Symphony first slice

### Goal

Define the first Dadeto-local implementation slice for the Symphony-style orchestrator described in `dadeto-p3de` without starting from a generic framework. This note is intentionally local-surface-first: it names one concrete entrypoint, one minimum config shape, one first observable operator flow, and the seams that can move into `src/core/` later if the local workflow proves stable.

### First local entrypoint

- Runtime entrypoint: `src/local/symphony/server.js`
- Purpose:
  - boot a long-running local orchestrator process beside the existing writer runtime
  - load Dadeto-local workflow/config
  - poll the local issue source
  - schedule one bounded runner loop at a time
  - emit operator-visible status to a local surface

This should stay under `src/local/` for the first slice. Do not start with `src/core/` orchestration classes or a generic multi-project daemon.

### Minimum workflow and config inputs

The first slice only needs enough input to claim one bead, create one local workspace loop, and report observable status.

#### 1. Workflow policy file

- Path: `WORKFLOW.md` at repo root
- First-slice responsibilities:
  - define allowed command families
  - define required quality gates before bead closure
  - define handoff/comment requirements
  - define whether the loop is single-runner or parallel

The workflow loader can be local and Dadeto-specific at first. Do not try to invent a cross-repo policy DSL yet.

#### 2. Local config file

- Suggested path: `tracking/symphony.local.json`
- Minimum fields:
  - `tracker`: bead source and selection mode
  - `workspaceRoot`: where per-bead worktrees or working dirs live
  - `logDir`: where run logs and summaries are written
  - `pollIntervalMs`: scheduler cadence
  - `maxConcurrentRuns`: start with `1`
  - `defaultBranch`: usually `main`

Example first-slice shape:

```json
{
  "tracker": {
    "kind": "bd",
    "readyCommand": "bd ready --sort priority"
  },
  "workspaceRoot": ".worktrees/symphony",
  "logDir": "tracking/symphony",
  "pollIntervalMs": 30000,
  "maxConcurrentRuns": 1,
  "defaultBranch": "main"
}
```

#### 3. Repo-local tracker contract

- Source of truth: `bd`
- First-slice commands:
  - read ready beads
  - claim/update one bead to `in_progress`
  - append run comments/evidence
  - close or requeue bead

No abstract tracker client is needed yet beyond the local Dadeto `bd` command wrapper.

### First observable operator flow

The first useful operator-visible loop should be:

1. Start `src/local/symphony/server.js`.
2. Server loads `WORKFLOW.md` and `tracking/symphony.local.json`.
3. Server polls `bd ready --sort priority`.
4. Server selects one runner-safe bead.
5. Server creates or selects one local workspace for that bead.
6. Server starts one coding-agent run for that bead.
7. Server writes:
   - current bead id
   - run state
   - last command/result
   - workspace path
   - latest bead comment/evidence
8. Operator can inspect status locally without reading terminal scrollback.
9. On completion, the run records bead evidence and updates final status.

### First operator-visible surface

Keep the first visibility surface local and boring:

- machine-readable state file: `tracking/symphony/status.json`
- append-only run log: `tracking/symphony/runs/<timestamp>-<bead>.log`
- optional local HTML or text dashboard later

The first slice does not need a browser UI, cloud dashboard, or remote API. A status file plus logs is enough.

### What stays local now

Keep these pieces under `src/local/` for the first slice:

- workflow file reader for Dadeto’s `WORKFLOW.md`
- `bd` command integration
- local scheduler loop
- workspace directory/worktree creation policy
- local status/log writing
- agent run launcher wrapper

These are still discovering their shape and should not be promoted into `src/core/` yet.

### Likely later extraction seams into `src/core/`

If the local slice proves stable, these become good extraction candidates:

- workflow normalization/parsing
- tracker-agnostic run state model
- workspace lease lifecycle helpers
- orchestrator state machine
- agent run result model
- status event/log formatter

Do not extract them before the local slice has at least one successful end-to-end bead loop.

### Explicit non-goals for slice one

- multi-project orchestration
- remote worker execution
- generic issue-tracker abstraction beyond the local `bd` wrapper
- browser UI beyond static status artifacts
- parallel scheduling beyond `maxConcurrentRuns: 1`
- generalized `src/core/` orchestration framework

### Follow-up implementation seams

The next implementation beads can safely target:

1. `src/local/symphony/config.js`
   - load and validate `tracking/symphony.local.json`
2. `src/local/symphony/workflow.js`
   - read `WORKFLOW.md` and expose bounded policy values
3. `src/local/symphony/tracker-bd.js`
   - wrap `bd ready/show/update/comments/close`
4. `src/local/symphony/status-store.js`
   - write `tracking/symphony/status.json` and run logs
5. `src/local/symphony/server.js`
   - single-runner orchestration loop using the pieces above

### Acceptance signal for this note

This note is sufficient if a later runner can implement the first local slice without needing to choose:

- the initial runtime entrypoint,
- the minimum config file shape,
- the first operator-visible flow, or
- the local-vs-core boundary for slice one.
