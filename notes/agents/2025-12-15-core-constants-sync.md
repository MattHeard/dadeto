# Core constants copy sync

- **Unexpected hurdle:** Browser core was pulling from `public/core/constants/selectors.js`, but that file lacked the new `MODERATOR_RATINGS_FORM_SELECTOR` after editing `src/core/constants`. The missing export surfaced as an import error in the console before the bundle even reached the logic.
- **Diagnosis:** The console error pointed to the browser bundle; a quick diff showed `src/core/constants/selectors.js` had the export while `public/core/constants/selectors.js` did not. The copy workflow copies only top-level `src/core` files, so nested directories like `core/constants` were never refreshed.
- **Resolution:** Added a dedicated `copyCoreConstants` step that mirrors `src/core/constants` into `public/core/constants`. Running `npm run copy` now keeps the derived constants directory aligned with the source tree without manual edits.
- **What I learned:** Whenever new shared folders appear under `src/core`, verify the copy workflow covers them—otherwise you'll ship stale/exploded assets and the browser bundle fails before hitting any logic.
- **Open question:** Should we add a regression (smoke) test that ensures `public/core/constants` mirrors the source (e.g., checksum match) to catch this class of sync bugs earlier?
