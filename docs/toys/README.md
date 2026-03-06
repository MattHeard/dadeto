# Toy Documentation Contract

Every toy/workflow experiment must ship a minimal documentation set so future loops can reason quickly.

## Mandatory per-toy docs

- `spec.md` — scope, purpose, actors, and explicit non-goals.
- `acceptance.md` — executable acceptance criteria with evidence commands/artifacts.
- `failure-modes.md` — known breakpoints and first-response playbooks.
- `harness.md` — local/CI harness instructions, required fixtures, and expected outputs.

## Suggested structure

Create one folder per toy under `docs/toys/` and include all four files above.
If a toy graduates to production behavior, retain docs as historical context and link to owning subsystem docs.
