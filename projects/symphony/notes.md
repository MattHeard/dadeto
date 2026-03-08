# Symphony

## Outcome

Establish Symphony as the repo's active project for planner-driven bead generation and small worker execution loops.

## Current state

Local Symphony already has a runnable scaffold in `src/local/symphony/` with config loading, workflow loading, status persistence, and ready-bead polling evidence. The repo also now has a minimal `projects/` and `beads/` structure, but the Symphony project note has not yet carried enough structured context for recurring planner review.

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

## Candidate next actions

- Document the planner review cadence and decision inputs in a short Symphony-specific workflow note.
- Add one example `beads/open/` file for a real Symphony follow-up task instead of the placeholder example bead.
- Write a short note describing how `tracking/symphony/status.json` and run logs should be read during planner review.
- Tighten the file-based bead scaffold format so expiry and archive expectations are explicit in docs.
