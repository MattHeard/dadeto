# Mutation loop: generate-stats-core

- Unexpected hurdle: the first mutation dry run omitted the runtime-loaded `stats-page.html` asset, and the ESM suite required VM-modules mode.
- Diagnosis: focused Jest passed under `NODE_OPTIONS=--experimental-vm-modules`; including the HTML asset made Stryker’s sandbox match that environment. Remaining survivors were fixed rendering, metadata, Firestore traversal, invalidation, and cron protocol nodes.
- Fix: included the static asset in the authoritative scan and documented exact fixed protocol boundaries; split multiline literals so suppressions targeted the actual mutated nodes.
- Evidence: final Stryker scan instrumented 339 mutants with 234 killed, 105 ignored, 0 survived, and 0 timed out; focused ESM Jest passed 42 tests.
- Next-time guidance: include runtime-loaded HTML assets in per-file Stryker `--files` and use VM-modules mode for import.meta-based modules.
