# Symphony TUI

## Outcome

Provide a Node-based terminal interface for the local Symphony server so operators can inspect the selected bead, queue health, and active run without relying on the HTTP endpoint alone, with a layout that expands and shrinks intuitively to fit the available terminal space.

## Priority

- MoSCoW: Must have. The TUI is the main visibility and manual-control surface for the live Symphony loop.
- RICE: Very high reach and impact because each improvement affects every operator check-in, with relatively small implementation slices.
- Cost of Delay: Very high. Weak visibility and awkward controls keep consuming operator time while Symphony becomes more central.

## Current state

The TUI now exists in `scripts/symphony-tui.js` and already renders a compact status view with polling plus an `L` launch shortcut. However, the project still behaves like a fixed small-pane dashboard rather than a responsive terminal layout: the compact view favors the bead title over the bead id, still renders inline shortcut/help text, and lacks the explicit `R` refresh key, the start/stop auto refresh-launch loop control, clear backlog visibility for other Ralph-ready beads, and the better non-500 launch-failure behavior described below.

## Constraints

- Use only Node.js dependencies already on the repo or light-weight new ones (e.g., `blessed`).
- Keep the first iteration small and local-first; add control actions only when they map directly onto existing Symphony HTTP triggers.
- The CLI should be runnable via `npm run symphony:tui` and handle the server being offline gracefully.
- The dashboard should adapt to the terminal size that is available, using extra width/height to show more context while still degrading cleanly to a cramped tmux pane.
- The minimum supported compact view should still fit concisely within a viewport about `40` characters wide by `10` lines high without wrapping into noise.
- Any keyboard-triggered action should be explicit, low-risk, and easy to understand in a small pane.
- Any auto-loop control should be explicit and reversible, with a clear visible state so the operator can tell whether the TUI is merely observing or actively driving refresh/launch cycles.
- The selected bead ID should be visually prominent so an operator can identify the active work item at a glance, even in the compact view.
- Pressing `L` at the wrong time should fail as a clear operator-state problem, not an internal `500`-style server fault; the worst case should be a `4xx` response or equivalent "not ready yet" message.
- The compact dashboard should not spend space on inline usage/help text such as a persistent `Shortcut:` reminder; if the controls are needed, they should be documented in project notes rather than always rendered in the TUI.

## Running

1. Launch the Symphony server: `npm run start:symphony`.
2. In a second terminal, run the TUI: `npm run symphony:tui`.
3. The CLI polls every five seconds and will show a friendly offline message until the HTTP endpoint responds.

## Layout behavior

- In a cramped pane, keep the view concise enough to fit roughly `40x10` by prioritizing the title, separator, four key fields (state, bead, run, recommendation), an evidence header plus the top two entries, and the polling footer.
- Within that compact view, prioritize the bead ID over the longer bead title when space is tight, and style or position it so it stands out as the primary work identifier.
- In a larger terminal, use the available space intentionally rather than centering the same tiny block in empty area; wider/taller layouts should reveal more queue, evidence, run-detail context, and backlog information for other Ralph-ready beads.
- Validate both ends of the layout: a cramped `40x10` pane should stay readable, and a larger terminal should visibly expand the rendered context instead of wasting the space.

## Candidate next actions

- Land `dadeto-tusi` so the bead id becomes more prominent than the title in the compact view.
- Add a responsive layout pass so the TUI scales up and down with the available terminal size instead of behaving like a fixed tiny dashboard.
- Add an `R` refresh shortcut through the existing refresh endpoint.
- Add a toggle that starts and stops an auto refresh-then-launch loop so the TUI can drive one-bead-at-a-time operation without repeated manual key presses.
- Render concise backlog information for other Ralph-ready beads so the operator can see what remains in the queue beyond the currently selected bead.
- Remove the always-visible `Shortcut:` help line so the compact view spends its lines on status instead of usage notes.
- Change wrong-time launch failures into clear operator-state responses instead of HTTP `500`-style errors.
- After the observational surface works, consider queue-summary highlights or other small operator aids.

## Launch shortcut behavior

- The current implementation still renders a `Shortcut: L -> launch next bead` reminder and keeps a `Launch: …` line so operators can see the result of the POST, but the project now explicitly wants that persistent shortcut reminder removed from the compact view.
- Pressing `L` POSTs to `/api/symphony/launch`, reusing the same endpoint that Symphony’s web UI already calls for “pop <bead>”. Success feedback shows the launched bead ID/title and the default fallback text when the JSON payload lacks those fields.
- When the Symphony server is offline, the fetch rejects (e.g., `ECONNREFUSED`), so the TUI keeps showing the offline status and updates the launch line to `Launch error: <connect error>`, matching the existing friendly polling message.
- When Symphony is not ready yet, the launch path should surface a clear operator-state failure instead of an HTTP `500`.

## Refresh shortcut behavior

- Add an `R` shortcut that POSTs to the existing refresh endpoint so the operator can prime the next bead without leaving the TUI.
- The refresh feedback should be as visible and compact as the launch feedback, including friendly handling for offline or empty-queue states.

## Auto-loop behavior

- Add a toggle that turns an auto refresh-launch loop on and off from the TUI instead of forcing repeated manual `R` then `L` interactions.
- When the loop is on, it should only use the existing Symphony refresh and launch endpoints and remain easy to interrupt locally.
- The TUI should always make the current auto-loop state obvious so the operator can tell at a glance whether it is passively observing or actively driving the next run.
- The first version should stay conservative: do not invent a new scheduler, do not bypass existing Symphony state checks, and do not hide launch failures.

## Backlog visibility

- The TUI should render concise information about the backlog of other Ralph-ready beads, not just the currently selected bead.
- In a cramped pane, this may be as small as a ready count plus one short summary line; in a larger terminal, it should expand into a more informative queue view.
- Backlog rendering should stay subordinate to the currently running bead and active run state, but it should still help the operator understand whether Symphony has more ready work waiting behind the current bead.

## MVP checklist

1. CLI fetches the status endpoint and renders the key fields in a terminal view.
2. The script handles connection failures with a friendly message and retries.
3. Running `npm run symphony:tui` is documented and works on Linux/macOS.
4. The dashboard scales with the available terminal space instead of behaving like a fixed-size status block.
5. The default compact dashboard stays legible in a pane roughly `40x10` characters.
6. The selected bead ID is visually prominent enough to scan quickly in the compact layout.
7. The operator can trigger the next Symphony loop with a documented keyboard shortcut.
8. The operator can explicitly refresh Symphony with a documented keyboard shortcut.
9. Launching at the wrong time yields a clear operator-state failure rather than an HTTP `500`-style server error.
10. The compact view does not spend a line on persistent inline shortcut help text.
11. The operator can turn an auto refresh-launch loop on and off from the TUI and tell which state it is in.
12. The TUI renders concise backlog information for other Ralph-ready beads.
13. The CLI leaves room for future enhancements (refresh timer, log viewing).
