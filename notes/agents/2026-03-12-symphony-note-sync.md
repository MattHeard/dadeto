## Symphony note sync loop 2026-03-12

- **Unexpected hurdle:** The existing project note already listed the main flows, so I had to reread the bootstrap/launch/app/launcher code and the live `tracking/symphony/status.json` to understand what the latest “MVP” artifacts really look like today.
- **Diagnosis path:** Inspected `tracking/symphony/status.json`, the Express/TUI wiring (`src/local/symphony/app.js`, `scripts/symphony-tui.js`), and the launch/launcher helpers to capture how queue polls, launches, run logs, and exit handling are persisted.
- **Chosen fix:** Updated `projects/symphony/notes.md` so the MVP list now mentions the refreshed tracker poll, HTTP endpoints, Codex launcher contract, persisted run logs, and exit-path state transitions; refreshed the “current limits” section to document the single-run/local-first boundaries.
- **Next-time guidance:** Revisit this note whenever the Symphony status model gains multi-run scheduling, configurable launch args, or consolidated dashboard coverage so the “MVP” bullets stay aligned with the actual server/log evidence.
