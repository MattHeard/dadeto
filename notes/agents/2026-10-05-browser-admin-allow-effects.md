# Browser admin AllowEffects migration

- Unexpected hurdle: admin's injected `fetchFn` handles both reads and mutations, while legacy tests assert URL-first fetch calls.
- Diagnosis: audited direct admin-core fetch call sites and isolated the four POST command paths; the remaining calls perform reads and stay outside this classification.
- Fix: mint per-command permissions in the browser boundary, forward each permission through admin core to the POST fetch call, enable capability linting for the participating core modules, and adapt existing tests through a test-only boundary fixture.
- Next-time guidance: when migrating a mixed-purpose injected transport, classify named command paths rather than adding permission to reads. Keep one regression that exercises the real boundary and proves per-command token ownership.
