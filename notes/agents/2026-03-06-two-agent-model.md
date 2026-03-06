# Agent Retrospective: two-agent model

- **Unexpected hurdle:** The single-agent invocation protocol handled bead selection, but it did not define who owns queue shaping versus who owns continuous execution when two agents are active.
- **Diagnosis path:** Compared the existing router and invocation docs against the desired foreground orchestrator/background runner workflow and found the missing pieces were role boundaries, queue protocol, and a required runner handoff comment shape.
- **Chosen fix:** Added `docs/loop/two-agent-model.md`, linked it from `AGENTS.md`, and updated the invocation protocol so the runner always leaves bead-visible evidence for the orchestrator.
- **Next-time guidance:** If you want this to become operationally automatic, the next step is standardizing bead metadata or helper commands so the orchestrator can filter for runner-safe beads without manual review.
