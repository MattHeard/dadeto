# Text utilities coverage

- Unexpected hurdle: the existing ignored build test file already contained the coverage suite and needed to be preserved.
- Diagnosis: the strict run confirmed that suite covers every branch, including the shorter trailing sentence in longest-sentence selection.
- Fix: restored the existing 11-test suite and retained it as the committed coverage evidence.
- Evidence: bead `dadeto-qy1` records the focused Jest command passing 11 tests at 100% statements, branches, functions, and lines.
