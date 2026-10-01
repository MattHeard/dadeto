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
acceptance results will be added after the aggregate and browser gates complete.
