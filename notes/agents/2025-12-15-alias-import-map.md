## Unexpected hurdles
- Dropping the `#core/browser/common` alias meant every browser module had to point at `./common.js`, which automatically flipped a ton of imports during the rebuild; I verified the search results and `public` assets to make sure nothing still referenced the alias before concluding the conversion was clean.
- Once the import map and alias vanished, the Jest data-URI harness started raising “relative paths” errors for any toy that still imported `../../common.js`, so I rewrote the existing inline loaders (`createBoldPattern`, `regexEscape`, `isEmptyText`, the minimax tests) to pipe sources through `rewriteRelativeImports` before encoding.
- Branch coverage dipped below 100% after refactoring the moderation handler because the generated request default wasn’t exercised; adding an explicit test that calls the handler without a request argument cleared the remaining invoice in coverage reports and taught me to remember default-parameter branches when striving for total coverage numbers.

## Lessons
- When removing a package-level alias, search globally for the old specifier and rely on a shared helper (the new `rewriteRelativeImports`) to keep inline data-URI tests usable without import maps.
- Guard coverage against instrumentation branches introduced by default values—call the handler with and without the optional argument so the `request = {}` path is hit.

## Follow-ups
- Confirm the next deployed build of `public/index.html` truly omits any import map or `#core/...` specifiers and let me know if we should add a lint rule that enforces using relative paths in browser modules going forward.
