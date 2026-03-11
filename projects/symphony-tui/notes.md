# Symphony TUI

## Outcome

Provide a small Node-based terminal interface for the local Symphony server so operators can inspect the selected bead, queue health, and active run without relying on the HTTP endpoint alone.

## Current state

Symphony already exposes `/api/symphony/status`, but visibility is limited to JSON output. This project will build a Node CLI that queries that API, renders key fields in a terminal dashboard, and optionally refreshes automatically. The goal is to improve manual visibility without overriding the HTTP surface.

## Constraints

- Use only Node.js dependencies already on the repo or light-weight new ones (e.g., `blessed`).
- Keep the first iteration purely observational; do not add control actions or side effects.
- The CLI should be runnable via `npm run symphony:tui` and handle the server being offline gracefully.

## Candidate next actions

- Create a small `scripts/symphony-tui.js` using `blessed` (or another minimal TUI lib) that fetches `http://localhost:4322/api/symphony/status` and displays `state`, `currentBeadId`, `activeRun`, `operatorRecommendation`, and `latestEvidence`.
- Add an npm script entry for `symphony:tui` that runs the CLI.
- Document how to start Symphony and the TUI together in README or notes.
- After the observational surface works, consider adding keyboard-driven refresh or queue-summary highlights.

## MVP checklist

1. CLI fetches the status endpoint and renders the key fields in a terminal view.
2. The script handles connection failures with a friendly message and retries.
3. Running `npm run symphony:tui` is documented and works on Linux/macOS.
4. The CLI leaves room for future enhancements (refresh timer, log viewing).
