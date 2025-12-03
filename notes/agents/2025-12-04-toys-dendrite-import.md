## Observations
- Toys now import `dendritePageHandler` from `browser-core` along with the other shared helpers, so the legacy `inputHandlers/dendritePage.js` shim is no longer needed for the runtime path.
- After rebuilding, the `public/browser/toys.js` copy reflects the same change, so the generated bundle already references the new export.

## Lessons and follow-ups
- When shifting handler ownership, update both the top-level consumers and the derived public copies to keep the build consistent.
- This is another reminder that we can gradually reduce these shims as the browsers update, but keeping them around briefly avoids breaking existing import paths while we transition.

## Open questions
- Should `src/browser/inputHandlers/dendritePage.js` be deleted eventually, or is it worth keeping for possible rollbacks?
