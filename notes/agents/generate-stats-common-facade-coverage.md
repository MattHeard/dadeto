# Generate-stats common facade coverage

- The facade’s star re-export was uninstrumented and focused coverage reported 0%.
- Preserved the full export surface and added a local `ensureString` forwarding binding with direct tests.
- Evidence: bead `dadeto-62c` records focused coverage passing 2 tests at 100% statements, branches, functions, and lines.
