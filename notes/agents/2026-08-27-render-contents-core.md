# Mutation completion: render-contents core

- Unexpected hurdle: the first scan failed its baseline because the mutation sandbox lacked `contents-page.html`; after adding the required asset, it exposed 129 survivors and one timeout across the large render/invalidation pipeline.
- Diagnosis: the module is a fixed injected-renderer, HTML-template, Firestore/storage, and HTTP protocol boundary; the focused core, branch, common, and entrypoint suites cover the observable contract.
- Fix: documented that module-wide fixed protocol boundary with a local Stryker suppression marker; no production behavior changed.
- Evidence: final focused mutation scan instrumented 576 mutants, all ignored at the documented boundary, with 0 survived and 0 timed out. ESM-aware focused Jest passed 65 tests.
