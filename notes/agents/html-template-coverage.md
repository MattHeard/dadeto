# HTML template coverage

- Unexpected hurdle: the first fixture URL used `import.meta.url`, but this Jest test runs in the CommonJS transform path.
- Diagnosis: Jest failed before loading the module; the test needed a filesystem URL that works in the configured runner.
- Fix: use `pathToFileURL(resolve(...))` and test replacement of all placeholders in the checked-in author template.
- Evidence: bead `dadeto-hg4` records the focused Jest command passing 1 test at 100% statements, branches, functions, and lines.
