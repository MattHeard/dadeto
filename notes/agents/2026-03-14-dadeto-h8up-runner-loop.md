# 2026-03-14: Render Symphony TUI ready backlog

- **Unexpected hurdle:** The TUI already claimed most of a 10-line budget for state/evidence info, so adding backlog detail risked crowding the active run while also increasing scroll depth.
- **Diagnosis path:** Reviewed `scripts/symphony-tui.js` and the status provider to understand how queue metadata is exposed and how `pushLine` relies on `MAX_LINES` plus footer slots.
- **Chosen fix:** Introduced a dynamic `getMaxLines()` tied to `process.stdout.rows`, capped cached tail lines, added helpers to compute and render the ready count plus `queueSummary` entries, and reserved a measurable backlog slot budget before event/evidence renders.
- **Next-time guidance:** When extending other TUI sections, adjust the shared line budget helpers so every new surface (backlog, events, footer) takes a predictable slice instead of the first-come line.
