# Bead Closure Docs Update

- unexpected hurdle: the runner docs already described closure mechanics, but the explicit rule to close a bead when acceptance criteria are met was easy to miss.
- diagnosis path: reviewed `docs/loop/two-agent-model.md`, `docs/loop/agent-invocation.md`, and the current bead trail for `dadeto-ymr2`; the evidence showed the loop reached its stop condition but stayed `IN_PROGRESS`.
- chosen fix: added an explicit close-on-success rule to both the invocation protocol and the canonical Ralph closure contract.
- next-time guidance: when tightening runner docs, state the success-to-close transition in one sentence near the closure steps so a successful bounded loop cannot linger open by default.
