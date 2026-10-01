# Mosslight crisp text and foreground art

Tiny browser fonts were antialiased before the logical 160x144 frame was
enlarged. Nearest-neighbor scaling preserves that blur; it cannot remove it.
The game now uses original 4x6 bitmap glyphs with five-pixel advance. Text
shapes opt into bitmap rendering, leaving other canvas toys unchanged.
HUD rows allow 30 characters; dialogue retains 28. Glyphs deliberately use
uppercase handheld lettering, integer coordinates and solid one-pixel fills.

Both presenters consume the same original 12px actor and prop art. The player
has a warm scarf/satchel palette; Mira, Vale, Juniper, Pip and Moth have distinct
silhouettes and colours. Actor feet animate on the deterministic clock, left
facing mirrors the art, and props include a stone well, seedling plot, fishing
rod, noticeboard and bed. Foreground pixels clip to the map viewport and draw
in depth order. No simulation or save schema changes are needed.

Tests cover deterministic animation, cast identities, fallback sprites, clipping,
solid glyph pixels, authored dialogue bounds, and exact presenter pixel parity.
Browser regressions inspect dialogue pixels for only the two authored colours
(no intermediate antialiasing shades) and ensure game text never calls fillText.
Keep normal canvas text as the default; bitmap rendering is explicit opt-in.

Initial focused tests: 12 passed, font/sprites/renderer coverage 100% across all
four metrics (.tmp/pixel-focused-coverage/coverage-summary.json). Detailed final
acceptance: TMPDIR=/home/matt/dadeto/.tmp npm run check exited 0, npm test and
all ten static gates passed (/tmp/dadeto-pixel-check-final.log). Repository
statements, branches, functions and lines all reached 100%
(reports/coverage/coverage-summary.json). npm run build passed
(/tmp/dadeto-pixel-build.log). Local Playwright with
test/mosslight.playwright.config.ts --workers=1 passed 15 tests, with three
intentional device skips (/tmp/dadeto-pixel-playwright-final.log). Phone and
desktop screenshots were generated; phone embedded screenshot was inspected
at /tmp/dadeto-dialogue-phone-embedded.png. Duplication: zero clones.

The first browser assertion assumed the first pixel of A was lit; bitmap A
has an inset top row, so test the prompt's actual lit row instead. A concurrent
first run also hit a focus/pause timing failure and was interrupted with signal
143; the separate browser and aggregate reruns completed successfully. Add
Record dictionary annotations for glyph and sprite palette lookups to satisfy
the strict JSDoc type gate. Sprite rows are slash-delimited strings to keep
authored art legible without duplicated array fragments in the clone scanner.

Source checkpoint f68d0968c1 deployed through successful Netlify run
36928742865. Live renderer and pixelFont.js were fetched and confirmed to use
bitmap text and shared spriteShapes.
