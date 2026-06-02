# Common Core Consolidation Note

I moved the check runner, fs, and path helper contents into `src/core/commonCore.js`, then wrapped them back out through the original entry files to keep compatibility.

The main snag was coverage: the shared default-stream fallback had a no-op `write` function that was covered by branch execution but not by function execution. The fix was to call the fallback `write` methods directly in the common-core test, and to add explicit tests for the real process-stream path and the no-argument resolver path.

Next time, if coverage drops after a shared-helper extraction, check for tiny returned callbacks and default-parameter branches before widening the refactor.
