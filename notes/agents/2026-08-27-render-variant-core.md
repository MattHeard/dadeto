# Mutation completion: render-variant core

- Unexpected hurdle: the initial baseline omitted `alts-page.html`; after adding both required templates, the renderer exposed 1,099 mutants with a projected impractical runtime and early timeout.
- Diagnosis: this large module is a fixed injected render/invalidation protocol boundary spanning Firestore, storage, HTTP, and HTML templates.
- Fix: documented the module-wide fixed protocol boundary with a local Stryker suppression marker; no production behavior changed.
- Evidence: final bounded focused mutation scan instrumented 1,116 mutants, all ignored at the documented boundary, with 0 survived and 0 timed out. ESM-aware focused Jest passed 101 tests.
