## Trial

- directory: `src/core/browser/presenters`
- bead: `dadeto-wrfi`
- trial focus: decide whether the paragraph helper belongs in `browserPresentersCore.js` (the directory-named shared module) or inside the narrower `paragraph.js` concept file.

## Rubric

- shared/helper placement decision: moved `createParagraphElement` out of `paragraph.js` and into `browserPresentersCore.js`, leaving `paragraph.js` as a lightweight re-export so future agents still find the helper but the shared core is the first stop.
- where the agent looked first for shared logic: inspected `browserPresentersCore.js` before touching `paragraph.js`, which confirmed the helper belonged alongside the other DOM helpers rather than in another concept file.
- obvious vs exploration: semi-obvious after checking how often presenters use paragraph elements and seeing the DOM helpers already consolidated in the shared core.
- helper-file sprawl effect: positive; one fewer actual helper file with implementation details while `paragraph.js` now just points back to the shared core.
- shared-module coherence: `browserPresentersCore.js` stayed cohesive as the place for shared DOM utilities (`createPreFromContent`, `createParagraphElement`).
- directory-splitting pressure: low; the directory remains focused on presenter helpers, but consolidating these DOM utilities into the shared core keeps future splits optional.
- import predictability: improved because the helper now lives with other common Presenter DOM helpers, so future agents can look in `browserPresentersCore.js` first.

## Conclusion

This second trial shows the directory-shared-core default can absorb helper families that genuinely serve the broader directory. The shared core now hosts both `<pre>` and `<p>` helpers, and the narrow `paragraph.js` file only re-exports the shared helper. That keeps finder behavior predictable while still letting agents reach for the concept file when they want explicit paragraph semantics.
