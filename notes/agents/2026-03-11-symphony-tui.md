# 2026-03-11 Symphony TUI slice
- **Unexpected hurdle:** network sandbox blocks `npm install`, so adding a new dependency such as `blessed` was not possible and the CLI needed to rely on built-in Node APIs instead.
- **Diagnosis path:** confirmed the blocker by watching `npm install --save-dev blessed` hang under the restricted network policy, then scoped the TUI to ANSI/console plumbing that already exists in Node.
- **Chosen fix:** added `scripts/symphony-tui.js` that polls `/api/symphony/status`, formats the required fields, and handles the server-offline case, plus the `symphony:tui` npm script and updated project notes about how to run it.
- **Next-time guidance:** if network access returns, revisit this surface to layer in `blessed` or a richer layout library and keep the docs synced with any added dependencies.
- **Testing:** `npm test`
