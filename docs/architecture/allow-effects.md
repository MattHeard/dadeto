# AllowEffects first-pass contract

Source: [Allow Effects – First Pass Specification](https://app.notion.com/p/matt-heard/Allow-Effects-First-Pass-Specification-3ef700afc301818ab016d5cbe5e8192a), fetched in full on 2026-10-04. Implementation owner: dadeto-feye.

`types/allow-effects.d.ts` exports a nominal JSDoc-visible `AllowEffects` interface with a private unique-symbol brand. Ordinary objects cannot accidentally satisfy it. `src/runtime/allow-effects.js` creates a fresh frozen permission at an external runtime boundary. Its trusted assertion connects the private compile-time brand to a private runtime symbol; application core code must never replicate that assertion or mint tokens.

The first classified command is submit-new-story's injected `saveSubmission`, whose first parameter must become `AllowEffects`. The runtime boundary must create the permission without changing the public HTTP/Firebase interface. Let actual compiler diagnostics identify intermediate functions needing explicit parameters; do not plan a manually enumerated forwarding path or close over the permission to preserve old signatures.

The final static contract has two parts: core code cannot import or otherwise invoke the factory, and type-aware ESLint rejects references to a capability unless it is a parameter of that same function. Capturing an outer token, storing it in a dependency object or implicit context, and returned callbacks hiding it all violate this contract. Name-only matching is insufficient because aliases and inferred types must also be recognized. The normal maximum remains four function parameters after temporary migration scaffolding is removed.

Read-only queries remain outside this first classification. Do not expand it to every command or broadly rewrite existing test interaction assertions. The token is permission, not the implementation mechanism of the Firestore write.

The initial compiler harness is `node scripts/run-jest.js --runInBand test/core/allowEffects.test.js`. It compiles virtual JavaScript against the actual factory and declaration without expected-error or ignore pragmas, asserting positive construction and diagnostic codes for missing/forged permissions. The factory/type harness alone is not acceptance of the full specification: classified endpoint migration, anti-smuggling enforcement, public endpoint regressions and terminal repository gates are mandatory before closure.
