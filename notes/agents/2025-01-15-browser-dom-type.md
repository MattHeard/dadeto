While moving the browser DOM type, I noticed `DOMHelpers` existed in both `src/core/browser/browser-core.js` and `src/core/browser/domHelpers.js`, which made it unclear which contract was authoritative. I confirmed the broader definition already lived in `src/core/browser/domHelpers.js` and updated `src/core/browser/browser-core.js` to import it instead of redefining a smaller subset.

Lesson: before relocating shared JSDoc types, search for duplicate typedefs and consolidate to a single source of truth so future updates don't drift. If you need the DOM helper contract elsewhere, import it from `src/core/browser/domHelpers.js` rather than recreating a pared-down version.

Open question: should we enforce a lint or documentation check to flag duplicate typedef names across files?
