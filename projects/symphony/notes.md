# Symphony

## Outcome

Establish Symphony as the repo's active project for planner-driven bead generation and small worker execution loops.

## Current state

Local Symphony already has a runnable scaffold in `src/local/symphony/` with config loading, workflow loading, status persistence, ready-bead polling, and operator recommendations for `ready`, `idle`, and `blocked` states. The local status surface can now represent completed and blocked runner outcomes, but Symphony still does not yet launch a runner loop on its own. The current open MVP execution bead is `dadeto-u210`.

## Constraints

Keep Symphony local-first for now. Do not add dispatch automation, multi-workspace orchestration, or external integrations until the local planner and worker loop is easier to review from repo docs alone.

## Open questions

- What is the smallest planner review cadence that should be reflected in repo docs without adding automation?
- Which single status artifact should SNC trust first when deciding whether Symphony is ready for another worker bead?
- When should open beads in the new file-based scaffold be refreshed versus archived?

## Planner review

Review Symphony at least once per runner handoff or repo-closure pass, and also whenever `tracking/symphony/status.json` shows a blocked or idle state. Before creating, refreshing, or archiving a worker bead, inspect these inputs in order:

1. `projects/symphony/notes.md` for current outcome, constraints, open questions, and candidate next actions.
2. `WORKFLOW.md` for the active local operator contract and required quality gates.
3. `tracking/symphony/status.json` for the current state, selected bead, `lastPollSummary`, and `latestEvidence`.
4. `tracking/symphony/runs/` logs or persisted `queueEvidence` when bead selection or queue shape needs explanation.

Treat `tracking/symphony/status.json` as the first planner artifact. `state: "ready"` means a bead can usually be refreshed or handed to a runner using `currentBeadId`, `lastPollSummary`, and `latestEvidence` as the short justification. `state: "blocked"` means SNC should inspect `latestEvidence` and `WORKFLOW.md` first before creating more work. `state: "idle"` means the queue was empty at the last poll, so planner effort should usually shift to creating or reshaping the next bead.

Inspect `tracking/symphony/runs/` when `status.json` is not enough to explain why a bead was selected, why the queue looked empty, or whether a handoff should stay blocked. Use `queueEvidence` and the matching run log to decide whether to create a fresh bead, refresh the current bead with clearer acceptance evidence, archive stale work that no longer matches the queue, or hand a bead back because the logged evidence shows a real blocker instead of missing planner context.

For the file-based scaffold under `beads/open/`, treat 24 hours as the freshness limit. If an open bead is still the right slice but its wording or acceptance evidence is stale, refresh the file in place. If the work is done, invalid, or superseded by a better-scoped replacement, move it to `beads/archive/`. If a bead is older than 24 hours and no longer matches the current queue shape, rewrite it as a new bead instead of quietly reusing the stale file.

## Future consideration

Symphony may eventually formalize project completion through evolving behavior-driven acceptance scenarios rather than fully specifying acceptance criteria up front. One possible model is to start with a one-sentence project outcome, derive MVP use cases as beads, and then refine the project-level acceptance scenarios after each deployed iteration based on real user feedback. Under that model, a project is done when user feedback no longer meaningfully changes those acceptance scenarios.

## External references

- OpenAI Symphony spec: https://github.com/openai/symphony/blob/main/SPEC.md

## Candidate next actions

- Launch one runner loop for the selected Symphony bead (`dadeto-u210`).
- Replace the placeholder file-based bead with a real Symphony example bead if the file-based scaffold is still being used as operator memory.
- After launch exists, expose the operator recommendation more clearly at the root Symphony HTTP surface.
- Only after launch works reliably, keep extending the autonomous loop from launched-run state toward repeatable scheduler behavior.
