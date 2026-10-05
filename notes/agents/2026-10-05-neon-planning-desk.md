# Neon Covenant reversible planning desk

## Hurdles and diagnosis

The first standalone/embedded browser attempt read rules version 10 because
the local E2E server serves generated `public/`, not source files. Rebuilding
the site before browser runs exposed the current rules-11 migration correctly.
The first controller journey also treated X as reopening the main menu after
undo, when it actually closes the Planning Desk; B returns to the lab menu.
The browser journey now follows the visible eight-button state transitions.

The initial implementation tripped strict clone detection on repeated result
objects, employee lookup and conventional object-literal/JSDoc boundaries.
Consolidating planning notices and roster lookup removed the structural
duplication without changing `.jscpd.json` or adding suppression. The full
repository check needs normal process spawning in this managed environment;
the sandbox-only attempt reported EPERM rather than code failures.

## Durable guidance

Draft history stores field-specific inverses, not prior full lab snapshots, so
undo preserves intervening actions. Validate the whole bounded stack before
applying inverses. Settlement commits and clears drafts; contract signatures,
promises, disclosures, and settlement remain irreversible. Rebuild `public/`
before using `test/mosslight-e2e/server.mjs`, and use the normal controller
buttons in standalone and embedded tests.

See the Planning Desk rules contract in `docs/toys/neon-covenant/spec.md`,
player boundaries in `manual.md`, and acceptance conditions in `acceptance.md`.
Exact focused coverage and current full-check/browser evidence are recorded in
the owning `dadeto-88mh` bead.
