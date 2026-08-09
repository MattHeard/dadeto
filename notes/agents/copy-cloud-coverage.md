# Copy cloud coverage

- Unexpected hurdle: this large workflow had no direct unit test and depends on `import.meta.url` plus filesystem adapters.
- Diagnosis: an injected ESM test with an in-memory filesystem drove the complete copy plan and isolated the remaining rewrite branches.
- Fix: added workflow coverage for directory/file copies, generated entrypoints, import rewrites, no-op rewrites, missing files, and propagated filesystem failures; removed one unreachable redundant equality guard in `rewriteImport`.
- Next time: use injected path and filesystem adapters to cover build orchestration without touching the real infra tree.

## Follow-up verification

- The focused suite covers the complete current module.
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/build/copy-cloud.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/build/copy-cloud.js' --coverageReporters=json --coverageReporters=text-summary` — 1 suite, 1 test passed; statements 150/150, branches 10/10, functions 37/37, lines 140/140.
