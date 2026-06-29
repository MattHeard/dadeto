Unexpected hurdle: the focused graph plot coverage run still failed the global gate even after the file under test passed, which masked the real file-level result.

Diagnosis: `graphPlotCore.js` still had uncovered series and fallback-normalization branches, and `plotShared.js` still lacked direct fallback-path coverage for the shared normalization helper.

Chosen fix: add explicit tests for invalid scalar fields, non-array series, non-empty series passthrough, and `buildGraphPlotFromJson` fallback behavior.

Next-time guidance: when a focused run reports a global threshold failure, read the per-file statement table first and close the smallest remaining statement gaps directly.
