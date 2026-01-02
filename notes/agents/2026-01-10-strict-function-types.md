Strict function types

- Enabled `strictFunctionTypes` in `tsconfig.jsdoc.json`, which is now part of the tsdoc gate after `strictNullChecks` earlier.
- Captured the expanded failure list in `tsdoc-check-output.txt` (mainly data/storage helpers, `tags`, toys, and cloud render/submit helpers complaining about unsound callback signatures) and created `dadeto-oul` to track the new blog/storage type mismatches that turned red under both strict flags.
- Ran `npm run lint` and `npm test` to keep the quality reports current; ESLint still only emits the known `battleshipSolitaireClues` warnings and no new issues resulted from the flag change.

Next steps: pick up the next tsdoc bead in the queue (e.g., `dadeto-91o` for strictPropertyInitialization or `dadeto-98t` for the remaining presenter docs) and trim the persistent tsdoc/tags/tooling errors now that both strict flags are on.
