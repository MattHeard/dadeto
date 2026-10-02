# Mosslight Valley live agent play

The dedicated game page registers observe/action/export/import WebMCP tools
against its existing runtime, not an independent game or the generic text-toy
executor. The observation includes the complete collision map, actor positions,
dialogue choices, battle state and journal. Each bounded action is an ordinary
simulation press with a release tick, so repeated interaction presses work.

All actions are validated before mutation. Imports use the existing versioned
save validator and persist the restored slot. Agent turns pause automatic ticking
and redraw immediately. Disposed callbacks reject; unregisterTool is used when
available. Unsupported browsers retain their existing gameplay.

Local Playwright initially caught a pre-existing Resume bug: its callback reset
frame timing but never resumed the runtime. The callback now resumes and redraws.
The regression exercises agent movement, refusal without partial mutation, save
round trip, paused ticks and Resume handoff on phone and desktop.

Keep game tools separate from generic run_toy approvals. Shared WebMCP response
serialization and no-argument read-only metadata live in core/browser/webmcp.js
to avoid duplicating protocol envelopes. Tool documentation is in the game's
manual. Evidence is recorded in dadeto-6t6h; repository hardening remains owned
by dadeto-aaou.

Evidence: 34/34 focused Jest tests with exact 100% statements, branches,
functions and lines for the game tool module (`.tmp/mosslight-webmcp-tests.log`,
`.tmp/mosslight-webmcp-coverage`). Main build, lint, JSDoc types, dependency and
non-core-thin gates pass in corresponding `.tmp/mosslight-webmcp-*.log` files.
Local Playwright passes 2/2 phone/desktop tests, including Mira's trust/bond
progression and persisted save restore (`.tmp/mosslight-webmcp-playwright.log`).
Duplication still reports 194 pre-existing clones at minTokens 14; new game tools
introduce none. The earlier aggregate run was deliberately interrupted (exit
130) before source edits for this new user request; a fresh aggregate is required
and no complete-green claim is made.
