# Symphony

## Outcome

Keep Symphony usable as Dadeto's local-first operator surface for selecting one ready bead, launching one Ralph run, and leaving enough status and log evidence for the next planner pass.

## MVP now

- The local Symphony surface exists in `src/local/symphony/` with workflow/config loading, `bd ready --sort priority` polling, status persistence, and an operator-visible HTTP/status shell.
- Symphony can launch one detached Ralph run for the selected bead and record the launch request, bead metadata, stdout path, stderr path, and run id under `tracking/symphony/status.json` and `tracking/symphony/runs/`.
- The current launcher is pinned to an explicit cheap model/config path: `codex exec --skip-git-repo-check --model gpt-5.1-codex-mini --sandbox workspace-write`.
- Planner review guidance for `status.json`, `queueEvidence`, and run-log inspection is already encoded here and in `WORKFLOW.md`; SNC should not need terminal history to understand the active run.

## Current limits

- Symphony still reports stale `state: "running"` after a launched Ralph run finishes. That is the main MVP trust gap now.
- The spawned Ralph loop now gets through launch and begins real repo work, but it can still terminate before completing the bead loop. That premature mid-loop exit is the current execution-side blocker.
- The current loop is single-run and local-first. Do not widen into retries, multi-run scheduling, multi-workspace orchestration, or external integrations yet.
- The HTTP server remains a convenience surface, not the durable source of truth; trust the persisted status file and run logs first.

## Planner review order

1. `tracking/symphony/status.json`
2. `projects/symphony/notes.md`
3. `WORKFLOW.md`
4. `tracking/symphony/runs/` for the matching run logs when `latestEvidence`, `lastPollSummary`, or `queueEvidence` need explanation

Read `status.json` first. `currentBeadId`, `lastPollSummary`, `latestEvidence`, and `activeRun` should usually tell SNC whether a bead was selected, launched, or is now stale enough to need reconciliation. Use run logs only when that summary is not enough.

## Open beads that match the live MVP

- `dadeto-n3nd`: reconcile finished Ralph runs back into Symphony status so completed runs stop looking active.
- `dadeto-vheu`: investigate why the current spawned Ralph loop begins startup work and then exits early before completing the bead loop.

## Not current anymore

- Launch is no longer the missing feature. Symphony already polls ready beads, records queue evidence, launches a detached Ralph process, and writes per-run stdout/stderr logs.
- Model-selection compatibility is no longer the current blocker. Symphony is already pinned to `gpt-5.1-codex-mini`, and fresh runs get past launch/model selection into real repo inspection.
- Pre-launch placeholder next actions should be treated as stale unless they point to the remaining reconciliation or operator-trust gaps above.

## External reference

- OpenAI Symphony spec: https://github.com/openai/symphony/blob/main/SPEC.md
