# 2026-03-14: Add Symphony event log

- **Unexpected hurdle:** Symphony had no compact way to surface multiple recent transitions inside the 10-line TUI, so adding an event log risked pushing the autop/evidence/footer area off-screen.
- **Diagnosis path:** Reviewed `schedulerStatus` producers in `src/core/local/symphony.js`, the Bootstrap/refresher flow, the status store, and the CLI TUI layout to understand where new data could live without breaking existing summaries.
- **Chosen fix:** Persist a capped `eventLog` array in the status snapshot/write path, append events from launches/outcomes, render them via a new `Events` section in `scripts/symphony-tui.js`, and cover the new helpers with unit tests plus the standard `npm test` run before closure.
- **Next-time guidance:** When expanding the status surface, keep the TUI footer budget in mind (Auto/Launch/Refresh/Error lines); reserve explicit slots for new sections or switch to a scrollable layout before clobbering the view.
