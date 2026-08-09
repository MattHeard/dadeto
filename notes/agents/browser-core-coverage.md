# Browser core coverage

- Unexpected hurdle: the existing browser-core suite covered cleanup with explicit extras but not the optional-argument default path.
- Diagnosis: strict focused coverage reported 100% statements, functions, and lines but 97.91% branches, with line 385 uncovered.
- Fix: added a focused test invoking `applyBaseCleanupHandlers` without `extraHandlers`.
- Evidence: focused Jest run reports 18 tests passed and 100% statements/branches/functions/lines for `src/core/browser/browser-core.js`.
- Next time: inspect branch-only gaps separately from statement gaps; defaults often require a distinct invocation even when the main path is covered.
