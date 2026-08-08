# Check overexposed exports coverage

- Unexpected hurdle: the final gaps were defensive parser/import forms and default output functions, not the main violation path.
- Diagnosis: coverage isolated plural reporting, default/literal imports, non-member calls, namespace non-matches, missing locations, and non-JavaScript directory entries.
- Fix: added focused AST and filesystem cases and removed two fallback branches that were unreachable after established map/index invariants.
- Next-time guidance: exercise both real parser syntax and hand-built AST nodes when a static-analysis tool supports multiple ESTree shapes.
