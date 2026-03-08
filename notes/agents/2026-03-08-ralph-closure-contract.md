# Agent Retrospective: Ralph closure contract

- **Unexpected hurdle:** the same runner doc already had an unrelated unstaged edit, so this bead could not safely rely on staging the whole file as one unit.
- **Diagnosis path:** inspected the current diff for `docs/loop/two-agent-model.md`, isolated the preexisting SNC operating-rules hunk from the new closure-workflow hunk, and then updated only the runner-facing closure area plus the cross-reference in `agent-invocation.md`.
- **Chosen fix:** added a canonical `Ralph Loop Closure` section with ordered closure steps, escalation guidance for non-mechanical failures, and a short pointer from the invocation doc back to that single procedure.
- **Next-time guidance:** keep closure sequencing centralized in the runner doc, and treat new AGENTS or loop-doc mentions as short references instead of parallel checklists.
