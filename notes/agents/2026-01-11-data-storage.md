Strict data and storage type tune

- Updated `BlogDataDependencies` (and normalized dependencies) to explicitly accept `null` for storage/memory/permanent lenses so the normalized bundle can be passed to every helper without a mismatch now that `strictNullChecks` is on.
- Refreshed `tsdoc-check-output.txt` after enabling both strict flags; the current list is now dominated by cloud/submit/story helpers plus `commonCore` strings, which will be captured by the new `dadeto-nmo` (cloud render/submit) and the existing `dadeto-007` children.
- Ran `npm run tsdoc:check`, `npm run lint`, and `npm test` to keep the quality gate updated; lint/test remain clean besides the battleship presenter warnings.

Next steps: dive into the tsdoc failures logged for the cloud helpers (`dadeto-nmo`), share what you fix there, and keep coloring in the epic's child beads until `dadeto-007` can close.
