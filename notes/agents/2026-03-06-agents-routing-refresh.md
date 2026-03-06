# Retrospective: AGENTS.md routing refresh

Unexpected hurdle: the prior `AGENTS.md` was already dense and comprehensive, so the challenge was deciding what to keep in-file versus what to route to `docs/` without dropping hard constraints.

Diagnosis path: I mapped the user-requested must-haves (Wiggum loop, completion criteria, single-loop-first, repo-memory rule, where-to-look links) against existing non-negotiables (bd tracking, test-before-close, push-required landing sequence). That made it clear the right move was a compact “router” document with explicit hard gates and doc pointers.

What I’d do next time: start by drafting a strict “non-negotiables list” first, then collapse everything else into references. This keeps edits short, high-signal, and less likely to accidentally omit a critical workflow rule.

Open follow-up idea: add a single canonical `docs/workflow/session-close.md` and point both AGENTS and contributor docs there to reduce future drift.
