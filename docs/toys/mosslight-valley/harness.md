# Harness — Mosslight Valley

## Automated

- Run the focused Mosslight Jest tests for simulation, save, embedded adapter, and full-page lifecycle.
- Run `npm run build` and confirm `/mosslight-valley/` plus the generated toy module are emitted.
- Run `npm run check` and record exact pass/fail evidence in the owning bead.

## Manual playthrough

1. Start a new save in the village; use directions to walk, A to speak to Mira and choose, B to cancel, and X → Field journal to check progress. Y → directions → A assigns B. Inspect the well.
2. Plant and tend the moon seed, rest through growth, then harvest and share the crop.
3. Visit the shore at dusk in suitable weather and catch the lantern fish; compare conditions when they are unsuitable.
4. Follow the orchard memory clues into the Hollow, collect fragments, use crafting, and inspect the heart door.
5. Defeat the guardian, make the final choice, and verify the ending reflects your relationship/world state.
6. Repeat the ending path with alternate choices; export and re-import a save midway through each mode.
7. On a phone, repeat opening interactions in the embedded preview with directions and A/B/X/Y; verify assignment, menu actions, dialogue dismissal, and one action per tap against the same saved simulation used by keyboard input.
8. Test keyboard, gamepad, touch, fullscreen, pause/resume, tab hide/show, and window blur/focus. Run `npx playwright test --config test/mosslight.playwright.config.ts` after `npm run build` for phone-emulated touch/layout and desktop keyboard/save checks.
