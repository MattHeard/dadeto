# THREEFOLD in-game travel and playtest recovery

- Unexpected hurdle: Existing page tests treated `?scene=` URLs as the way to select authored regions, and those tests hid the remaining URL-navigation assumptions after scene queries were removed from the page.
- Diagnosis: The scene query parser and authored `?scene=` links were removed; a repo-wide search and the first aggregate check then exposed tests still relying on the old routing contract.
- Chosen fix: Ignore scene query parameters, expose all authored regions through the page's in-game travel menu, switch the runtime scene while retaining independent region saves, and update route-specific tests to inject scenes directly. Add immediate input acknowledgments and an accessible startup/render failure recovery message.
- Verification: Focused Threefold and presenter tests pass (81 tests); `npm run check` passes all 10 gates; `npm run build` succeeds; `git diff --check` is clean.
- Next-time guidance: Keep query-string regression coverage that confirms `?scene=` leaves the default region selected. Use explicit scene injection only for unit tests of authored region copy; production travel belongs in the game UI.
