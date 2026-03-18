# 2026-03-18 dadeto-rmlb Symphony TUI width/height expansion
- **Unexpected hurdle:** the original `scripts/symphony-tui.js` mixed rendering with the live polling loop, so importing it for tests would have started the CLI instead of giving a pure layout assertion.
- **Diagnosis path:** traced the size clamps in the TUI entrypoint, then split the render logic into `src/local/symphony/tuiRenderer.js` so the renderer could be tested in isolation with explicit `columns` and `rows`.
- **Chosen fix:** switched the TUI to use terminal-aware width/height budgets when available while keeping the 40x10 fallback, and added `test/local/symphony.tuiRenderer.test.js` to prove the expanded layout shows more content in a larger terminal.
- **Next-time guidance:** if the surface grows again, keep new layout behavior in the pure renderer module first and keep the entrypoint thin so coverage stays deterministic.
