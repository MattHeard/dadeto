# Agent Retrospective: agent invocation protocol

- **Unexpected hurdle:** A short user command like `Take bead <id>` is only useful if the repo itself defines how to translate that into a bounded loop; otherwise each agent reinvents the prompt shape.
- **Diagnosis path:** Checked the router and Wiggum playbook and found loop philosophy plus workflow rules, but no canonical entrypoint for bead-based invocation.
- **Chosen fix:** Added `docs/loop/agent-invocation.md` and linked it from `AGENTS.md`, making `Take bead <id>`, `Take any bead`, and `Pop a bead` explicit triggers that require agents to derive and record a loop contract before editing.
- **Next-time guidance:** If bead quality is uneven, strengthen bead templates so hypothesis, evaluator, and stop-condition fields are easier to infer without extra triage.
