# Mutation loop: URL sanitizer

- Unexpected hurdle: the resumable scanner stopped on a valid zero-mutant file because Stryker omitted that file from `mutation.json`.
- Diagnosis: the report configuration listed the requested file but `files` was empty; the scanner also checkpointed a file before its run completed.
- Chosen fix: accept configured zero-mutant files as clean and checkpoint only after a scan completes.
- Mutation evidence: `src/core/browser/url.js` had 11 mutants; focused Stryker reported 0 survivors and 0 timeouts after adding direct URL compatibility assertions.
- Quality evidence: focused URL tests passed; full `npm run check` reached all non-test gates successfully but remains red on the pre-existing exact-HTML generator expectations for newly added input methods.
