# Symphony app coverage

- Hurdle: the local app test initially failed before loading because its runtime-version dependency uses `import.meta.url` under the CommonJS Jest transform.
- Diagnosis: the app test already exercises the core route handle; a static runtime-version mock isolates that unrelated ESM-only dependency.
- Fix: mock the runtime version module, add the orphaned-run fallback-id case, and remove nullish/type guards that are unreachable after reconciliation validation.
- Guidance: keep route coverage focused on injected core dependencies and test both `runId` and bead-id fallback identity paths.
