# Symphony TUI

## Outcome

Provide a small Node-based terminal interface for the local Symphony server so operators can inspect the selected bead, queue health, and active run without relying on the HTTP endpoint alone.

## Current state

Symphony already exposes `/api/symphony/status`, but visibility is limited to JSON output. This project will build a Node CLI that queries that API, renders key fields in a terminal dashboard, and optionally refreshes automatically. The goal is to improve manual visibility without overriding the HTTP surface.

## Constraints

- Use only Node.js dependencies already on the repo or light-weight new ones (e.g., `blessed`).
- Keep the first iteration small and local-first; add control actions only when they map directly onto existing Symphony HTTP triggers.
- The CLI should be runnable via `npm run symphony:tui` and handle the server being offline gracefully.
- The dashboard should remain readable inside a cramped tmux pane and fit concisely within a viewport about `40` characters wide by `10` lines high without wrapping into noise.
- Any keyboard-triggered action should be explicit, low-risk, and easy to understand in a small pane.
- The selected bead ID should be visually prominent so an operator can identify the active work item at a glance, even in the compact view.

## Running

1. Launch the Symphony server: `npm run start:symphony`.
2. In a second terminal, run the TUI: `npm run symphony:tui`.
3. The CLI polls every five seconds and will show a friendly offline message until the HTTP endpoint responds.

## Compact layout

- Every line is clamped to 40 characters and the view renders exactly the title, separator, four key fields (state, bead, run, recommendation), an evidence header plus the top two entries, and the polling footer to stay inside a 10-line pane.
- Within that compact view, prioritize the bead ID over the longer bead title when space is tight, and style or position it so it stands out as the primary work identifier.
- Validate the compact view by sizing a tmux pane to `40x10` or running `env COLUMNS=40 LINES=10 npm run symphony:tui` and confirming the output fits without wrapping or dropping the polling message.

## Candidate next actions

- Create a small `scripts/symphony-tui.js` using `blessed` (or another minimal TUI lib) that fetches `http://localhost:4322/api/symphony/status` and displays `state`, `currentBeadId`, `activeRun`, `operatorRecommendation`, and `latestEvidence`.
- Add an npm script entry for `symphony:tui` that runs the CLI.
- Document how to start Symphony and the TUI together in README or notes.
- Tighten the rendering so the most important state still fits cleanly in a `40x10` tmux pane.
- Make the selected bead ID more visually prominent than the bead title in the compact dashboard.
- Add a keyboard shortcut that triggers the next Symphony loop through the existing local HTTP launch surface.
- After the observational surface works, consider adding keyboard-driven refresh or queue-summary highlights.

## MVP checklist

1. CLI fetches the status endpoint and renders the key fields in a terminal view.
2. The script handles connection failures with a friendly message and retries.
3. Running `npm run symphony:tui` is documented and works on Linux/macOS.
4. The default dashboard stays legible in a pane roughly `40x10` characters.
5. The selected bead ID is visually prominent enough to scan quickly in the compact layout.
6. The operator can trigger the next Symphony loop with a documented keyboard shortcut.
7. The CLI leaves room for future enhancements (refresh timer, log viewing).
