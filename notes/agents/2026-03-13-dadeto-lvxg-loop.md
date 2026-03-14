# Symphony auto-loop launch guard

- **Unexpected hurdle:** The auto-loop still invoked `/api/symphony/launch` when Symphony reported a non-`ready` state because the scheduler relied on the shared `lastSymphonyStatus` after other polling (the periodic refresh) could overwrite it between the loop’s fresh poll and the launch decision.
- **Diagnosis path:** Replayed `runAutoLoopCycle` plus the global `refreshLoop` to see how the state check was done, confirmed the auto loop never inspected the response it just fetched and could therefore read a stale `state` if another refresh completed first.
- **Chosen fix:** Have `refreshLoop` return the status body (while still updating `lastSymphonyStatus` for display) and let `runAutoLoopCycle` base its ready check on that returned snapshot before firing `/api/symphony/launch`.
- **Next-time guidance:** When a loop both refreshes state and makes a decision, keep the decision tied to the localized result instead of a shared cache that other timers can clobber.
