# Symphony TUI renderer coverage

- Hurdle: the existing test covered only the local re-export, leaving the core renderer below full branch coverage.
- Diagnosis: most gaps were state/layout combinations; two branches were unreachable because rendered width is always at least the 40-column base width.
- Fix: add direct core tests for unavailable, version mismatch, queue, event, evidence, truncation, footer, and helper boundary states; remove the unreachable width branches.
- Guidance: test core renderer modules directly rather than relying on their thin local entrypoint re-exports.
