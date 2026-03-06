# Agent retrospective: toy template rollout

- Unexpected hurdle: `bd` CLI is referenced as mandatory workflow tooling but is not installed in this environment (`bd: command not found`).
- Diagnosis path: ran `bd prime` first per router instructions, confirmed shell-level command resolution failure.
- Chosen fix: proceeded with the bounded docs task and captured the deviation in execution evidence.
- Next-time guidance/open question: include a bootstrap/install note for `bd` in repo setup docs or provide a fallback workflow when unavailable.
