# Mosslight dialogue layout

The phone screenshot exposed a mismatch: the embedded adapter emitted one unwrapped text shape, while the dedicated renderer independently wrapped text into a fixed-height panel. Neither path reserved adequate space for longer dialogue and choices.

The renderer now builds the same bordered dialogue shapes for both modes. Conservative 28-character rows fit the 8px monospace font, including long words. Panel height follows the rendered rows, with selected-choice text and the continue/confirm hint on separate rows above the HUD. All authored dialogue and every choice selection are checked for bounds and exact parity in the renderer regression suite.

Focused Jest passed 33 tests across two suites; duplication remains zero at minTokens 15. Browser tests import a real dialogue save and exercise the embedded submission and dedicated frame loop on phone and desktop. The embedded toy intentionally does not render until an input is submitted; wait for keypad initialization and submit before asserting the canvas. Its canvas is drawn before DOM attachment, so identify captured draw calls by logical dimensions rather than ancestor selectors. Phone captures were visually inspected: the screenshot's bellmaker line now wraps into two rows with a separate continue hint.

Validation initially hit ENOSPC because the accumulated Jest cache filled the 2GB /tmp filesystem. Rerun using TMPDIR=/home/matt/dadeto/.tmp rather than treating cache-write or browser-launch failures as source defects. Serial Playwright workers avoid concurrent browser-window focus interference with the game pause test.

Evidence logs: /tmp/dadeto-dialogue-focused.log, /tmp/dadeto-dialogue-duplication.log, /tmp/dadeto-dialogue-build.log, /tmp/dadeto-dialogue-check-localtmp.log, /tmp/dadeto-dialogue-playwright-localtmp.log. Phone/desktop canvas captures are /tmp/dadeto-dialogue-{phone,desktop}-{embedded,page}.png. Final acceptance outcomes are recorded in dadeto-wcn4.

The browser suite passed 11 tests with 3 intentional device-specific skips using one worker. Moving dialogue off the old wrapping function uncovered two previously incidental coverage paths: an omitted choice list in imported saves and an empty ending. Explicit regressions restore exactly 100% renderer coverage across all four metrics; artifact .tmp/dialogue-focused-coverage/coverage-summary.json. The final aggregate rerun is /tmp/dadeto-dialogue-check-final.log. Production deploy 36896483705 succeeded, and a live fetch confirmed both presenters use dialogueShapes.

Final acceptance: TMPDIR=/home/matt/dadeto/.tmp npm run check exited 0. The test gate passed, followed by all 10 static gates with zero failures. Global statements, branches, functions, and lines are exactly 100% in reports/coverage/coverage-summary.json. The owning bead was closed only after this terminal result.
