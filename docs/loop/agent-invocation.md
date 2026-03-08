# Agent Invocation Protocol

Use this document when a user says `Take bead <id>`, `Take any bead`, or `Pop a bead`.
The purpose is to convert a short user instruction into one bounded Wiggum loop without requiring a pasted prompt.

If the repo is operating in the two-agent pattern, pair this document with `docs/loop/two-agent-model.md`.

## Canonical Entry Commands

### 1) `Take bead <id>`

Interpret this as:

1. Open the specified bead and read its latest comments/evidence.
2. Derive one loop contract from the bead and current repo docs.
3. Record or tighten the loop contract in `bd` before editing files.
4. Execute exactly one bounded loop.

### 2) `Pop a bead`

Interpret this as:

1. Pick one ready/open bead.
2. Prefer the highest-priority bead with clear local evidence and a bounded slice.
3. Claim/update the bead if needed.
4. Derive one loop contract and execute exactly one bounded loop.

If two-agent mode is active, the runner should also leave a bead comment summarizing the attempt even when it finishes cleanly, so the orchestrator can monitor queue health without reconstructing terminal history.

### 3) `Take any bead`

Treat this the same as `Pop a bead`.

## Required Translation Step

Before editing files, translate the bead into this loop contract and retain it in `bd` comments:

1. **Hypothesis**
   - What specific boundary or risk is being tested?
2. **Minimal slice**
   - What is the smallest file/behavior change that can test the hypothesis?
3. **Acceptance evidence**
   - Which exact command(s), artifact path(s), or diff outcome prove success?
4. **Cheapest first evaluator**
   - Which low-cost check runs before broader validation?
5. **Repo-memory artifact**
   - What doc/test/harness/script/note will remain for the next agent?
6. **Stop condition**
   - When must the agent stop widening scope and create follow-up work instead?

If the bead does not contain enough context to fill these fields, the next action is to tighten the bead, not to improvise a broad implementation.

## Default Heuristics

When the user gives only a bead reference, use these defaults unless the bead clearly requires something else:

- **Hypothesis:** the bead can be advanced by one bounded change without broad refactor.
- **Minimal slice:** one file or one behavior path first.
- **Acceptance evidence:** required evaluator(s) from `docs/quality/definition-of-done.md` plus one bead-specific proof point.
- **Cheapest first evaluator:** start narrow, then escalate only if risk justifies it.
- **Repo-memory artifact:** at minimum, the required `notes/agents/` entry; prefer tests/harness/docs when they create a reusable guardrail.
- **Stop condition:** after two failed attempts without a tighter hypothesis, better evaluator, or smaller slice, stop and open follow-up beads.

## How Users Can Help Without Pasting Prompts

Short clarifications are enough. Good examples:

- `Take bead dadeto-kytz. Focus only on the presenter file first.`
- `Pop a bead, but prefer docs/harness work over refactors.`
- `Take any bead touching toys, but avoid cloud packaging today.`
- `Take bead dadeto-xxxx. Reduced warning count is sufficient for this loop.`

These are helpful because they constrain slice, evidence, or risk without replacing the protocol.

## When To Ask The User Anything

Do not ask the user to restate the whole task.
Ask only if one of these is true:

- The bead conflicts with current repo state or another active change.
- The bead implies destructive or high-risk work not justified by existing evidence.
- The bead is too vague to derive even an initial hypothesis and minimal slice.

Otherwise, proceed with the derived loop contract.

## Two-Agent Shortcut

When SNC is preparing work for Ralph, prefer this sequence:

1. tighten the bead into one bounded loop
2. add a `Runner suitability` comment
3. send Ralph to that bead

When Ralph receives a bead, check for that comment first.
If it is missing and the bead is not obviously trivial, hand it back instead of improvising queue policy.

For end-of-loop closure, use the canonical runner procedure in `docs/loop/two-agent-model.md#ralph-loop-closure` rather than reconstructing the landing-the-plane sequence from multiple docs.
