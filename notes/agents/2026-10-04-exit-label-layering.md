# Exit destinations are annotations, not terrain

The live compute-room `EVALUATION` label was still covered by rack art.
The real Neon frame reproduced 48 later foreground rectangles intersecting
the label's text bounds. Its destination sign belonged to terrain, which
was painted before props, NPCs and the player.

Crossing generation now returns world tiles and destination signs separately.
Render order is terrain, crossing tiles, foreground sprites, opaque signs,
HUD, then modal panels. Arrows retain their existing world depth; labels
remain readable without changing room geometry, exits or collision. Both
the standalone canvas and embedded presenter consume that same shape order.

The scenery regression reproduces the overlapping compute rack and asserts
that no later world rectangles can cover the text, that its opaque background
fits the label, and that menus still cover annotations. Browser acceptance
checks actual sign pixels through ordinary controller navigation on phone
and desktop, not merely the presence of a text payload.
Independent desktop test taps use 60ms key presses, below the game's 125ms
movement-repeat interval. A 150ms hold can legitimately move two cells on a
fast frame loop; fixed-count navigation should not confuse that with a bug.

Evidence is recorded in `dadeto-88mh`. Keep this rendering checkpoint separate
from the incomplete rules-six relationship integration in the primary checkout.

The first browser run passed embedded labels but failed both standalone cases:
`drawGameFrame` independently assembled its layers. Sharing `worldLayers` fixed
both paths, rather than weakening the pixel assertion. Final focused coverage
passed 251 tests in 18 suites, with all renderer coverage metrics exactly 100%.
The rebuilt browser run passed all 16 phone/desktop crossing, dialogue, journal
and menu-marker cases, including all four Neon sign pixel comparisons.

For a small shareable demo, record `#game-screen.captureStream(30)` with a
MediaRecorder in a disposable Playwright browser context. Drive the actual
directions/A/X inputs without importing or changing simulation state. Save
the WebM, then convert with FFmpeg to H.264/yuv420p, nearest-neighbor 6x scaling,
30 fps and `+faststart`. This records only the logical screen, excluding browser
chrome, local save controls and unrelated private content. Use the repo-local
TMPDIR for Chromium: the machine's system temporary partition is full.

The final isolated `npm run check` exited 0: test summary 1/1 and static
summary 10/10 passed, with zero clones at unchanged minTokens 14. Site build
also exited 0. Logs: primary checkout `.tmp/exit-label-full-check-final.log`,
`.tmp/exit-label-full-check.exit`, `.tmp/exit-label-build-final.log` and
`.tmp/exit-label-browser-final.log`. An initial interactive gate process was
terminated with 143; a PTY-backed rerun completed, so do not mistake the
interrupted run for terminal evidence. The MP4 demo is 22.8 seconds,
960x960/30fps H.264/yuv420p, about 530 KiB, silent, fully decode-checked and
visually reviewed. Temporary media artifacts are not repository source assets.
