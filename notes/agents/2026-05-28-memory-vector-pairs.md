# Memory Vector Pairs Retrospective

Unexpected hurdle: the first cut of `MEMO2` tripped the repo's complexity rule in the new `projectToVector` branch and the copied test file still carried the old `MEMO1` expectations.

Diagnosis path: I ran a focused ESLint/Jest pass on the new source and test files, then used the formatter and a small helper split to isolate the object-handling branch from the scalar/array cases.

Chosen fix: I added a separate `memoryVectorPairs` toy entry, projected plain objects into `{ key, value }` vectors, kept scalar and array behavior unchanged, and updated the new toy docs and blog metadata to point at `MEMO2`.

Next-time guidance: when versioning a toy, add the new blog entry and public asset in the same loop so the old version and the new version stay easy to compare, then pin the new object-shape behavior with one direct test before widening to the full suite.
