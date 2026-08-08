# Submit-new-page helpers coverage

- The helper facade’s direct re-exports were uninstrumented and focused coverage reported 0%.
- Replaced them with forwarding functions while preserving the existing helper behavior tests.
- Evidence: bead `dadeto-zfr` records focused coverage passing 7 tests at 100% statements, branches, functions, and lines.
