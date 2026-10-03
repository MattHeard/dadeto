# Mosslight eight-button controls

The physical and WebMCP control contract is directions plus A/B/X/Y only.
A confirms/interacts, B performs a saved assignable shortcut or goes back,
X opens/closes the controller menu, and Y opens the B assignment picker.
Menus expose gameplay actions, story/help, journal, inventory, pause,
fullscreen, save slots, export/import, and a safe two-step slot reset.
Both presenters use the same controllerMenu simulation boundary and menuLines.
Legacy semantic simulation commands remain internal; obsolete physical keys
and gamepad Start/Select are not mapped. Native browser utility elements are
hidden implementation adapters, not additional game controls.

Unexpected hurdles: the old journal obscured a guide dialogue that still owned
input; menu rendering and input ownership now agree. A paused menu also kept
advancing and autosaving idle frames, racing imported or restored saves before
reload. The runtime freezes idle paused frames but consumes release edges and
allows the eight buttons to resume navigation. Persist the active save slot in
the save adapter so the embedded per-submission runtime retains slot choice.

Evidence: .tmp/mosslight-eight-all-coverage.log records 102 passing tests in
11 suites and exact 100% statements/branches/functions/lines in controls,
input, simulation, combat, renderer, runtime, save, and pagePresenter.
.tmp/mosslight-eight-pause-browser.log records eight passing phone/desktop
crossing, journal, and slot-reset regressions after fixing the pause race.
.tmp/mosslight-eight-build-final.log records a successful build.
.tmp/mosslight-eight-final-static.log records nine successful gates and only
the existing strict duplication failure (100 clones, down from 101).
No exemptions, ignores, or threshold changes were added.

The complete local browser command
`TMPDIR=/home/matt/dadeto/.tmp npx playwright test --config=test/mosslight.playwright.config.ts`
passed 47 tests with three existing device-specific skips (3.6m), recorded in
.tmp/mosslight-eight-browser-complete-final.log. Native export downloads and
import file pickers were exercised through the controller menus on both devices.
The first complete run had one Auto-checkbox setup race; the embedded keypad
already enables Auto on a real press, so the harness waits for Submit readiness
instead of clicking a checkbox during asynchronous toy initialization.

Aggregate acceptance is recorded separately in bead dadeto-7l1o when its
running evaluator terminates. Remaining global clone work belongs to
dadeto-aaou; focused coverage is not global gate evidence.
