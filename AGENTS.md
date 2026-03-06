# Repository Routing Guide

This file is a **short operating router** for agents in this repo.
Detailed policy and playbooks live under `docs/`.

## Wiggum Loop Operating Model

Run work as a tight, evidence-driven loop:

1. Select one bounded task.
2. Define acceptance evidence.
3. Record the loop contract in `bd` (hypothesis, acceptance command/artifact, owner).
4. Execute one loop.
5. Observe the failure mode.
6. Encode the fix into repo memory/harness.
7. Re-run the loop.

### Loop Completion Criteria

A loop is complete only when **both** are true:

- It delivers **user-visible value** OR a **loop-value artifact** (test, harness, guardrail, doc update, or automation).
- It records **evidence**: artifact path and/or command output proving success.
- It leaves **durable repo memory**: updated test, harness, doc, script, or `notes/agents/` entry that another agent can follow without terminal history.
- It verifies required quality gates in `docs/quality/evaluator-matrix.md` and `docs/quality/definition-of-done.md` before closure.

### Single Loop First

Default to **one-agent / one-task / one-loop** execution.
Only split into multi-agent choreography after failure evidence shows a single loop is insufficient.

### Repo Memory Rule

If an agent cannot see it in repo docs, tests, scripts, or harnesses, it does not exist operationally.
Encode important behavior in the repository before claiming completion.
For every new toy folder under `docs/toys/`, start by copying all files from `docs/toys/_template/` and fill them before considering the loop complete.

## Where to look first

Start here before broad changes:

- `docs/repo-map.md`
- `docs/loop/manifesto.md`
- `docs/loop/wiggum-playbook.md`
- `docs/quality/evaluator-matrix.md`
- `docs/failure-modes/`
- `docs/toys/`
- `docs/toys/README.md` (new toy creation flow and required templates)
- `docs/toys/_template/` (mandatory base files for every new toy)

## Non-Negotiable Workflow Constraints

## 1) Issue tracking (`bd`) is required

- This repo tracks work in **bd (beads)**.
- Run `bd prime` for full workflow context.
- Use daemon mode first; retry with `--no-daemon` only if daemon/lock issues occur.
- Core commands:
  - `bd ready --sort priority`
  - `bd ready --sort priority --unassigned`
  - `bd update <id> --claim`
  - `bd update <id> --status=in_progress`
  - `bd comments add <id> "...evidence..."`
  - `bd close <id>`
  - `bd sync`
- If quality warnings appear (tests/lint/coverage/etc.) and no bead exists, create one.
- At loop start, record the hypothesis and named acceptance evidence in the owning bead.
- After each evaluator run, add/update bead comments with exact commands, pass/fail state, and artifact paths.
- If a loop fails twice without a tighter hypothesis or better evaluator, stop broad implementation and convert the blocker into a bead/doc/harness follow-up.

For full triage/autoloop details: `bd prime` and docs linked above.

## 2) Test-before-close is required

- Run `npm test` before closing any bead.
- Record the exact command + outcome in bead comments as closure evidence.
- Keep branch coverage expectations at 100%; create/fix beads for gaps.

See:
- `docs/quality/evaluator-matrix.md`
- `docs/failure-modes/`

## 3) Landing-the-plane is required (session is not done until pushed)

When code/docs change, complete this flow:

```bash
git pull --rebase
bd sync
git push
git status   # must show up to date with origin
```

Rules:

- Never end with unpushed local commits.
- Never hand off with “ready to push”; you must push.
- If push fails, resolve and retry until success.

Use canonical procedures in:
- `docs/loop/manifesto.md`
- `docs/loop/wiggum-playbook.md`
- `docs/failure-modes/`

## Build / Test / Dev command quick list

- `npm install`
- `npm run build`
- `npm test`
- `npm run lint`
- `npm run start`

Prefer repo docs for command intent and troubleshooting over duplicating long instructions here.

## Coding and review expectations

- Follow project conventions in `CLAUDE.md` (style, naming, defensive coding).
- Keep changes bounded; extract helpers to manage complexity.
- Avoid `eslint-disable` comments unless explicitly approved.
- PRs must include **Summary** and **Testing** sections with executed commands.

## E2E policy (important)

- Playwright E2E is cloud-executed (Cloud Run Jobs), not local-first.
- For local validation, use Jest/unit workflows unless explicitly instructed otherwise.
- Commit e2e changes normally; CI workflow executes them in GCP.

See related docs under `docs/` and workflow files under `.github/workflows/`.

## Agent retrospective requirement

After completing meaningful work, add a concise note under `notes/agents/` covering:

- unexpected hurdle,
- diagnosis path,
- chosen fix,
- next-time guidance or open questions.

## Commit hygiene

- Stage all changes together (`git add -A`) before commit.
- Do not leave modified files unstaged/uncommitted.
- Use concise commit messages that state intent.

---

If any instruction here conflicts with system/developer/user directives, follow that higher-priority instruction and document the deviation in your evidence.
