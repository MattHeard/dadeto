# Symphony TUI Auto-Loop Launch State

- **Unexpected hurdle**: The auto-loop was blindly calling `/api/symphony/launch` after every refresh cycle, so it hit Symphony’s `state !== 'ready'` guard and surfaced an internal HTTP 500 instead of signaling that the bead wasn’t launch-ready.
- **Diagnosis path**: I inspected `scripts/symphony-tui.js`, replayed how `runAutoLoopCycle` sequences the refresh and launch calls, and confirmed there was no local readiness check or status caching before invoking launch.
- **Chosen fix**: Track the last successful `/api/symphony/status` response, rerun the status poll after the auto refresh completes, and bail out with a clear “state X” message whenever the refreshed state isn’t `ready`, so the loop never fires a launch request unless Symphony is explicitly ready.
- **Next-time guidance**: Keep the auto-loop feedback tied to the persisted status snapshot so future automation can layer on pre-checks (e.g., confirming the selected bead ID is still present) without duplicating the status call.
