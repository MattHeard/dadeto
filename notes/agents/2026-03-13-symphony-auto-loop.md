# Symphony TUI Auto-Loop

- **Unexpected hurdle**: The existing TUI only exposed manual `L`/`R` actions and rendered status errors to `console.error`, so any auto-loop failure or status fetch problem quietly disappeared from the compact dashboard even though operators need obvious signals.
- **Diagnosis path**: Reviewed `scripts/symphony-tui.js` alongside the Symphony TUI notes and observed the missing auto-loop toggle, the persistent `Shortcut` help line, and the lack of on-screen feedback for failed status polls.
- **Chosen fix**: Added an explicit `A` toggle with on/off state, auto-drive loop scheduling, and status/error feedback lines while keeping refresh/launch calls conservative; refreshed the UI to drop the redundant `Shortcut` line and display the new auto-loop state plus any status fetch failures so operators can see what happened.
- **Next-time guidance**: Keep the auto-loop state/highlighting inside the existing render budget; if further automation is needed, consider exposing a controlled delay parameter instead of changing the polling cadence.
