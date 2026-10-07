# AllowEffects for document-store writes

- Unexpected hurdle: `loadWorkflow` can bootstrap files and prune draft files, so the method name alone does not indicate a read-only operation.
- Diagnosis: traced `loadWorkflow`, `saveDocument`, index movement, and index selection through workflow bootstrap, pruning, and persistence helpers.
- Fix: bind every public store operation once, thread its permission through mutation helpers, and require it on injected `mkdir`, `rm`, and `writeFile` adapters. Keep `readFile` permission-free.
- Next: repeat the injected-adapter audit for Notion Codex and Symphony persistence. Retain the compiler and capability-lint feedback when adding new operations.
- Verification: core and local wrapper tests assert the actual filesystem contract; final aggregate gate evidence is recorded in Beads.
