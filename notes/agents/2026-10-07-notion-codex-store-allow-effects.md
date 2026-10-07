# AllowEffects for Notion Codex state and outcomes

- Unexpected hurdle: state and outcome persistence are separate cores with distinct write APIs, and their tests use injected filesystem callbacks directly.
- Diagnosis: traced each public `writeState`/`writeOutcome` operation to its directory and file writes; read APIs only call `readFileImpl`.
- Fix: bind each write once at the store boundary and forward that permission into both injected filesystem callbacks. Local adapters discard the token when invoking Node filesystem functions.
- Next: cover the shared detached-process launcher separately; its adapters are also used by Symphony.
- Verification: focused store tests assert exact token identity for mkdir/writeFile; final aggregate gate evidence is recorded in Beads.
