# Function graph cross-file edges

- Unexpected hurdle: the graph reported zero cross-file edges despite having import-resolution code.
- Diagnosis: imported bindings were stored as `{ source, imported }`, but `importTarget` read a nonexistent `target` property.
- Fix: return the stored import binding and add a regression test for a call to an imported function.
- Next time: inspect the generated edge mix (including cross-file counts) after graph changes; the full check suite currently has environment/dependency failures unrelated to this change.
