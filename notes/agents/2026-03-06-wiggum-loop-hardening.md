# Agent Retrospective: Wiggum loop hardening

- **Unexpected hurdle:** The repo-level `npm run lint` command runs with `--fix`, so validating a docs-only loop still edited unrelated Joy-Con mapper files.
- **Diagnosis path:** Compared the new Wiggum docs against `docs/quality/definition-of-done.md` and `docs/quality/evaluator-matrix.md`, then checked the lint diff to separate real loop improvements from auto-fix churn.
- **Chosen fix:** Tightened `AGENTS.md` and `docs/loop/wiggum-playbook.md` so agents must record the loop contract in `bd`, retain evaluator evidence there, stop after repeated un-narrowed failures, and classify flaky evaluators/scope mismatch explicitly.
- **Next-time guidance:** Consider splitting `npm run lint` into a non-mutating CI/check mode and a separate `--fix` mode so evidence-gathering loops do not create unrelated edits.
