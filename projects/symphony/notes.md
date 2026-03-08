# Symphony

## Outcome

Keep Symphony usable as Dadeto's local-first operator surface for selecting one ready bead, launching one Ralph run, and leaving enough status and log evidence for the next planner pass.

## MVP now

- The local Symphony surface exists in `src/local/symphony/` with workflow/config loading, `bd ready --sort priority` polling, status persistence, and an operator-visible HTTP/status shell.
- Symphony can launch one detached Ralph run for the selected bead and record the launch request, bead metadata, stdout path, stderr path, and run id under `tracking/symphony/status.json` and `tracking/symphony/runs/`.
- Planner review guidance for `status.json`, `queueEvidence`, and run-log inspection is already encoded here and in `WORKFLOW.md`; SNC should not need terminal history to understand the active run.

## Current limits

- Symphony still reports stale `state: "running"` after a launched Ralph run finishes. That is the main MVP trust gap now.
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
- `dadeto-6tgv`: exercise one full Symphony Ralph loop and report the spawned-agent outcome against the current launch flow.
- `dadeto-vrk8`: finish the Codex model-pin work only if the launcher configuration still needs to be brought back to a stable supported setting.

## Not current anymore

- Launch is no longer the missing feature. Symphony already polls ready beads, records queue evidence, launches a detached Ralph process, and writes per-run stdout/stderr logs.
- Pre-launch placeholder next actions should be treated as stale unless they point to the remaining reconciliation or operator-trust gaps above.

## External reference

- OpenAI Symphony spec: https://github.com/openai/symphony/blob/main/SPEC.md
