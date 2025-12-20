The tsdoc check failed far beyond the input handlers folder, so the unexpected part was scoping the fix to just `src/core/browser/inputHandlers` while still keeping the run reproducible. I focused on typing DOM helper usage (casting created elements, widening DOMHelpers for option/button types, and tightening input handler JSDoc) and left the unrelated tsdoc errors untouched for a follow-up pass.

Lesson: when updating DOM helper contracts, check every helper that calls `dom.createElement` and cast to the concrete element type early to avoid a cascade of type errors. Keep a small checklist: create-element casts, event handler types, and data record typing.

Open question: should we add a smaller tsdoc script that scopes to `src/core/browser/inputHandlers` to keep targeted fixes from being blocked by existing warnings elsewhere?
