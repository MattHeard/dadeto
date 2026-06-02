# Duplication threshold 37

- Hurdle: lowering the duplication threshold to `37` exposed a new clone in the memory vector toys.
- Diagnosis: `memoryVectorPairs` was treating arrays as object-like values, so a permanent array read was being projected into key/value pairs instead of staying a plain array.
- Fix: added a shared `projectArrayOrSingletonToVector` helper in `memoryVector.js`, reused it from `memoryVectorPairs.js`, and corrected the array branch so arrays stay arrays while objects become key/value vectors.
- Guidance: when tightening duplication further in this area, check the array-vs-object split first; it is the fragile boundary that can create both clone and behavior regressions.
