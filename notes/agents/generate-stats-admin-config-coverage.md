# Generate-stats admin config coverage

- The facade’s star re-export was uninstrumented; focused coverage initially reported 50% statements and 0% functions.
- Preserved the full re-export surface and added a local `ensureString` forwarding binding with direct tests.
- Evidence: bead `dadeto-380` records focused coverage passing 2 tests at 100% statements, branches, functions, and lines.
