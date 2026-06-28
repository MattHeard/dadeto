# Failure Modes: Battery Breakout

- Miskeyed blog post
  - Symptom: the toy is published under the wrong storage key or build manifest entry.
  - Guardrail: the toy persists under `BATT4`, and the blog manifest uses `BATT4`.
- Manual key drift
  - Symptom: the PRD mentions `BATB1`, but the repo uses a different approved key.
  - Guardrail: the implementation and docs consistently use `BATT4`.
- Charge-state regression
  - Symptom: battery cells never stabilize or never overcharge.
  - Guardrail: unit tests cover charge transitions, stable cells, and overcharge loss.
- Unbounded state growth
  - Symptom: per-frame input or history arrays grow without limit.
  - Guardrail: state normalization keeps only bounded game state and no history log.
