# Symphony

## Outcome

Keep Symphony usable as Dadeto's local-first operator surface for selecting one ready bead, launching one Ralph run, and leaving enough status and log evidence for the next planner pass.

## Priority

- MoSCoW: Must have. Symphony is the control plane for the rest of the active queue, so trust gaps here tax every other project.
- RICE: Highest reach and impact with modest effort because improvements affect every future Ralph loop and every operator interaction.
- Cost of Delay: Very high. Delay keeps wasting operator attention and makes every autonomous loop less trustworthy.

## MVP now

- `src/local/symphony/bootstrap.js` already seeds `tracking/symphony/status.json` with the latest queue poll (`bd ready --sort priority`), `lastPoll`, and the selected bead metadata so the HTTP/TUI surface can show `currentBeadId`, `lastPollSummary`, `latestEvidence`, and `queueEvidence` without re-running that command manually.
- The Express app exposes `/api/symphony/status` for the read-only view, `/api/symphony/launch` to call `launchSelectedRunnerLoop`, and `/api/v1/refresh` to re-run the tracker poll + status reconciliation. The TUI at `scripts/symphony-tui.js` (Ctrl+C exit) hits those endpoints so operators see `State`, `Bead`, `Run`, `Rec`, and coming-soon evidence lines every five seconds.
- Launching now runs `createCodexRalphLauncher`, which spawns `codex exec --skip-git-repo-check --model gpt-5.4-mini --sandbox workspace-write` with the Ralph prompt contract (`you are ralph ... pop <bead>` plus `run id`). The launch writes `activeRun`/`lastLaunchAttempt` in `status.json`, persists `tracking/symphony/runs/<runId>--launch.log|--stdout.log|--stderr.log`, and offers `operatorRecommendation` pointing at the artifacts.
- The spawned process has an `onExit` handler (`createRunnerExitHandler`) that waits for the initial status write, reads the persisted file, runs `applyRunnerOutcome`, and writes `state: idle` (or `blocked`) plus a `lastOutcome` summary when the detached Ralph loop exits. Recent closures such as the run tracked in `tracking/symphony/runs/2026-03-12T19-43-55.699Z--dadeto-x2yg` prove the endpoint lifecycle completes end-to-end.

## Current limits

- Symphony still runs one detached Ralph loop at a time (maxConcurrentRuns: 1) and exposes only the single highest-priority ready bead. There is no scheduler logic to move beads into `in_progress`, re-prioritize them automatically, or handle multiple workspaces.
- Operators must refresh manually (or wait for the 30 s poll) to update queue state and then click “L”/POST `/api/symphony/launch`; there is no dashboard that reconciles `bd` statuses with `tracking/symphony/status.json`, so some beads still stay open even after the runner finishes.
- The current launcher is deliberately pinned to the cheap `gpt-5.4-mini` model with `workspace-write` sandboxing; configuration changes still require editing `tracking/symphony.local.json` and restarting the Symphony server.
- Run artifacts live under `tracking/symphony/runs/` and are the durable source of truth when `status.json` is stale, but navigating them remains a manual chore for the operator; the TUI surface simply points at those files in `operatorRecommendation`.
- Symphony does not yet expose a concise recent event stream such as `bead started`, `bead closed`, `launch rejected`, or `agent failure`, so operators can end up staring at `idle` state without enough context to understand what just happened.

## Planner review order

1. `tracking/symphony/status.json`
2. `projects/symphony/notes.md`
3. `WORKFLOW.md`
4. `tracking/symphony/runs/` for the matching run logs when `latestEvidence`, `lastPollSummary`, or `queueEvidence` need explanation

Read `status.json` first. `currentBeadId`, `lastPollSummary`, `latestEvidence`, and `activeRun` should usually tell SNC whether a bead was selected, launched, or is now stale enough to need reconciliation. Use run logs only when that summary is not enough.

## Open beads that match the live MVP

- `dadeto-x2yg`: reconcile this project note with the live Symphony behavior after refresh/launch/status improvements.
- Add a bounded bead to identify and eliminate the file-descriptor-on-garbage-collection warning so the local server stops leaking or deferring cleanup.
- Add a bounded bead to persist a recent agent-event log that surfaces key transitions like `bead started`, `bead closed`, `launch rejected`, and `agent failure` in operator-visible status output.
- Future Symphony-facing slices should focus on operator trust, durable launch/trigger visibility, and stronger “land the plane” closure behavior rather than rebuilding refresh/launch basics.

## Event visibility

- Symphony now persists a bounded `eventLog` array in `tracking/symphony/status.json` so the status surface can list the last few transitions (start, close, launch rejection, agent failure) without requiring manual log inspection.
- The TUI renders those entries in a new `Events` section before the usual evidence block so operators see what just happened while the queue stays compact.
- Event visibility should complement `latestEvidence`, not replace the detailed run logs under `tracking/symphony/runs/`.

## Not current anymore

- Launch is no longer the missing feature. Symphony already polls ready beads, records queue evidence, launches a detached Ralph process, and writes per-run stdout/stderr logs.
- Model-selection compatibility is no longer the current blocker. Symphony is already pinned to `gpt-5.4-mini`, and fresh runs get past launch/model selection into real repo inspection.
- Queue refresh is no longer the missing feature either. Symphony already exposes and uses the refresh trigger, and the TUI/project queue now assumes that refresh exists.
- Pre-launch placeholder next actions should be treated as stale unless they point to the remaining reconciliation or operator-trust gaps above.

## External reference

- OpenAI Symphony spec: https://github.com/openai/symphony/blob/main/SPEC.md
