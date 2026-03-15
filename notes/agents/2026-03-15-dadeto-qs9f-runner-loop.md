# 2026-03-15 Remove compact Symphony TUI shortcut help

- **Hurdle:** The compact `scripts/symphony-tui.js` view always spent its footer line on launcher/refresh help text, so removing it risked losing feedback or changing the 40×10 compact layout.
- **Diagnosis:** The persistent hint came from the default `launchFeedback`/`refreshFeedback` strings and was rendered even when no action had occurred; the rest of the footer already guarded against empty feedback lines.
- **Chosen fix:** Clear the default strings so the `Launch:` and `Refresh:` rows only appear for actual feedback while keeping the existing messages for trigger/auto loop flows.
- **Next time:** If more footer elements change, re-check `BASE_MAX_LINES` against `getMaxLines()` so the compact pane still fits without losing evidence/backlog lines.
