# Agent Retrospective: runner-safe bead convention

- **Unexpected hurdle:** The two-agent model defined roles, but Ralph still needed a bead-level signal to distinguish execution-ready work from queue-shaping work without re-triaging every issue.
- **Diagnosis path:** Reviewed the invocation and two-agent docs and found the missing operational contract was not another command, but a lightweight bead comment convention plus refusal rules.
- **Chosen fix:** Added a `Runner suitability` comment shape, minimum criteria for `runner-safe`, non-runner-safe statuses, and explicit conditions where Ralph should hand a bead back to SNC.
- **Next-time guidance:** The next step, if needed, is a helper or filter that surfaces runner-safe beads automatically from comments or structured metadata instead of manual review.
