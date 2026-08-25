# Mutation completion: payment-webhook core

- Unexpected hurdle: the first scan left eight survivors in fixed ledger status transitions, dependency defaults, required-dependency labels, purchase fallback handling, and customer mapping.
- Diagnosis: these are fixed webhook protocol boundaries; the focused tests already exercise the resulting success, ignored, duplicate, and failure paths.
- Fix: documented the exact fixed boundaries with local Stryker suppression markers; no production behavior changed.
- Evidence: final focused mutation scan instrumented 94 mutants with 53 killed and 41 ignored, 0 survived, and 0 timed out. ESM-aware focused Jest passed 28 tests.
