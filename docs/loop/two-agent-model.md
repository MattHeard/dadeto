# Two-Agent Operating Model

Use this model when the repo is being run by:

- `super-nintendo-chalmers` as the foreground orchestrator
- `ralph` as the background runner

The purpose is to keep user conversation, queue shaping, and bead triage in one place while a second agent continuously executes bounded loops.

## Role Split

### `super-nintendo-chalmers` (orchestrator)

Owns:

- talking with the user
- creating new beads
- tightening vague beads before execution
- splitting beads that are too broad
- reviewing runner comments and deciding next action
- protecting queue quality so the runner does not improvise broad work

Should generally avoid:

- disappearing into long implementation loops while acting as orchestrator
- letting the runner work unbounded without explicit bead ownership

## SNC Operating Rules

When acting as orchestrator, `super-nintendo-chalmers` should apply these rules before sending work to `ralph`:

1. **Split mixed warning families before execution**
   - If one bead mixes different work types or evaluators, such as JSDoc cleanup plus control-flow refactoring, split it into separate beads first.
   - Prefer one warning family, one owned slice, and one acceptance path per runner loop.

2. **Choose the evaluator before tightening the bead**
   - Do not send a complexity or lint bead to `ralph` until the primary acceptance signal is explicit.
   - If raw warning count is misleading for the owned slice, record a better metric up front, such as slice-local peak complexity, aggregate excess, or a targeted file-local warning delta.

3. **Treat contract-shaped warnings as redesign work**
   - If repeated bounded attempts only move branch budget around without improving the warning, stop creating more micro-refactor loops against the same shape.
   - Convert the problem into a contract/design bead or explicitly record the warning as accepted local debt.

4. **Encode repo-specific lint constraints into bead shape**
   - Before tightening a lint bead, inspect whether `complexity`, `no-ternary`, default arguments, optional chaining, `??`, `||`, or `max-params` are the actual trigger.
   - Shape the bead so `ralph` starts with tiny pure helpers, early returns, or options objects where those constraints are known to matter.

5. **Use runner handoff as queue input, not a permission loop**
   - After `pop bead <id>` or equivalent, `ralph` should execute immediately unless blocked by missing scope, evaluator, or environment.
   - When `ralph` hands work back, treat the comment as queue-shaping evidence: tighten the bead, split it, redirect it, or mark it blocked. Do not bounce it back unchanged.

6. **Store tentative sequences in project notes before turning them into beads**
   - When a project has an obvious likely sequence of future slices, record that sequence in the project note first instead of creating a long queue of speculative beads.
   - Prefer keeping only the current ready slice, and at most one clearly stable next slice, as actual beads.
   - Re-read the live repo state after each closed bead before promoting the next tentative slice into a runner-safe bead.

### `ralph` (runner)

Owns:

- selecting one ready bead
- recording the loop contract in `bd`
- executing one bounded Wiggum loop
- running required evaluators
- closing the bead if the loop is complete
- leaving a comment for the orchestrator if blocked, partial, or redirected

Should generally avoid:

- chatting with the user
- reshaping the whole queue
- planning beads, inventory beads, or policy-definition beads that SNC should own directly
- inventing new multi-bead plans without leaving them for orchestrator review

Exception:

- SNC may still send Ralph one bounded spike-research bead when that evidence is needed to shape the next implementation bead.
- That exception is for targeted evidence gathering, not for routine queue planning.

## Queue Protocol

### When the user says `Pop a bead`

Interpret this as:

1. `super-nintendo-chalmers` inspects ready beads and overall queue health.
2. If the top bead is vague, blocked, or too large, tighten or split it first.
3. `ralph` takes one ready bead and runs exactly one bounded loop.

### When the user says `Take bead <id>`

Interpret this as:

1. `super-nintendo-chalmers` verifies the bead is still valid and sufficiently bounded.
2. If valid, `ralph` takes that bead and runs one bounded loop.
3. If invalid or underspecified, the orchestrator updates the bead before the runner starts.

### When the user says `Take any bead`

Interpret this as:

1. The orchestrator prefers the highest-priority ready bead with clear local evidence.
2. The runner executes one bounded loop on that bead.

## Runner-Safe Bead Convention

A bead is **runner-safe** when `super-nintendo-chalmers` has already reduced it to one bounded loop that `ralph` can execute without inventing queue policy.

Mark a bead as runner-safe by adding a bead comment in this shape:

```text
Runner suitability
- status: runner-safe
- scope: one bounded loop
- primary evaluator: <command>
- stop condition: <when ralph must stop and hand back>
- notes: <optional risk or file boundary>
```

Minimum criteria for `runner-safe`:

1. The bead has a clear minimal slice.
2. The first evaluator is known and locally runnable, unless the bead explicitly names a CI/cloud artifact path.
3. The stop condition is explicit.
4. The bead does not require queue reshaping, product prioritization, or major architectural choice before starting.

Use these non-runner-safe statuses when needed:

- `needs-triage`
  - The bead still needs SNC to clarify scope, evaluator, or intent.
- `orchestrator-only`
  - The bead is mostly queue shaping, planning, splitting, policy definition, or inventory work that should stay with SNC.
- `blocked`
  - The bead depends on another task, environment fix, or external decision.

Default rule:

- Ralph is the do-er and SNC is the planner.
- If a bead is primarily deciding what should happen next rather than doing the next bounded implementation slice, it should stay with SNC unless SNC explicitly marks it as a spike-research exception.

If no runner-suitability comment exists, `ralph` should assume the bead is **not** runner-safe and hand it back to SNC unless the task is trivially bounded from existing evidence.

## Runner Loop Contract

For every bead `ralph` touches, it must leave enough Beads state that `super-nintendo-chalmers` can understand what happened without terminal access. If the bead's acceptance path includes a full test or verification command, `ralph` should allow that command to complete before deciding the bead is partial or blocked.

At minimum, add/update bead comments with:

1. **Loop contract**
   - hypothesis
   - minimal slice
   - acceptance evidence
   - cheapest first evaluator
   - stop condition
2. **Execution evidence**
   - commands run
   - pass/fail results
   - artifact paths
3. **Outcome**
   - closed
   - blocked
   - partial progress
   - redirected/split into follow-up beads
4. **Recommendation for orchestrator**
   - next smallest action
   - whether to tighten, split, requeue, or deprioritize the bead

If the bead was marked `runner-safe`, mention whether that classification still appears correct after the attempt.

## Required Runner Handoff Comment

When `ralph` cannot finish a bead, leave a direct handoff comment in this shape:

```text
Runner handoff for super-nintendo-chalmers
- status: blocked | partial | needs split
- hypothesis tested: ...
- smallest attempted slice: ...
- evidence: ...
- failure label: ...
- recommended next action: tighten bead | create follow-up bead | requeue after dependency | abandon current approach
```

Use the failure taxonomy from `docs/loop/wiggum-playbook.md`.

`ralph` should use the handoff path instead of continuing when:

- the bead is missing a runner-suitability comment and is not trivially bounded
- the requested work expands into multiple plausible next beads
- the evaluator path is unclear or unavailable
- success requires an architectural or prioritization decision from SNC

## Ralph Loop Closure

When `ralph` finishes a bead without handing it back, use this as the canonical closure contract. Do not treat the bead as done until every required step below has succeeded.

1. Run the required evaluator set for the bead, including `npm test` when repo policy requires the full suite before closure.
2. Record execution evidence in `bd`, including exact commands, pass/fail results, and relevant artifact paths or proof points.
3. Add the required `notes/agents/` retrospective when the loop produced meaningful repo work or a durable lesson.
4. Stage the full intended result with `git add -A` so closure does not leave partial tracked changes behind.
5. Create the commit for the completed loop.
6. Run `git pull --rebase` before push. If the worktree has unrelated unstaged edits that must be preserved, use the smallest safe equivalent such as `git pull --rebase --autostash`.
7. Run `bd sync`.
8. Run `git push`.
9. Run `git status` and verify the branch is up to date with `origin` before closing the bead.
10. Only after push and status verification succeed, run `bd close`.

If any non-mechanical closure step fails, `ralph` must resolve or escalate instead of stopping early. Typical examples are rebase conflicts, push rejection, unexpected dirty-state collisions, or ambiguous diffs that make `git add -A` unsafe. In those cases, preserve evidence in `bd`, describe the blocker clearly, and hand the bead back rather than claiming completion.

## Orchestrator Review Cycle

`super-nintendo-chalmers` should periodically review runner comments and do one of the following:

1. tighten the same bead and send it back to the runner
2. create one or more follow-up beads
3. mark the bead blocked with a clearer dependency
4. close stale or invalid work
5. redirect the runner to a better next bead

The orchestrator should treat runner comments as queue-shaping input, not as a request for free-form chat resolution.

## Completion Rules

A bead is done only when the runner or orchestrator has completed the `Ralph Loop Closure` procedure or an equivalent orchestrator-owned closure path with the same guarantees.

If the runner stops before push succeeds and `git status` is verified, the loop is not complete.

## Recommended User Interaction Pattern

Talk only to `super-nintendo-chalmers`.
Typical user requests should be short:

- `Pop a bead`
- `Take bead dadeto-kytz`
- `Take any bead, but prefer docs and harness work`
- `Create a bead for X, then send ralph after it`

The orchestrator is responsible for turning those into clean runner work.
