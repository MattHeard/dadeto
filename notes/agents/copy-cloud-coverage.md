# Copy cloud coverage

- Unexpected hurdle: this large workflow had no direct unit test and depends on `import.meta.url` plus filesystem adapters.
- Diagnosis: an injected ESM test with an in-memory filesystem drove the complete copy plan and isolated the remaining rewrite branches.
- Fix: added workflow coverage for directory/file copies, generated entrypoints, import rewrites, no-op rewrites, missing files, and propagated filesystem failures; removed one unreachable redundant equality guard in `rewriteImport`.
- Next time: use injected path and filesystem adapters to cover build orchestration without touching the real infra tree.
