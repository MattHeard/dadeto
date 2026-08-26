# Mutation completion: core index

- Unexpected hurdle: the 1,138-line shared index had an uncommitted adapter-specific suppression change and no direct focused test for its exported adapter surface.
- Diagnosis: this file is a declarative shared utility/filesystem-adapter boundary; the existing local markers were normalized into one documented module boundary while preserving their intent.
- Fix: added a synchronous adapter contract smoke test and a module-wide fixed-boundary Stryker marker; no runtime behavior changed.
- Evidence: final focused mutation scan instrumented 349 mutants, all ignored at the documented boundary, with 0 survived and 0 timed out. ESM-aware focused Jest passed 1 test.
