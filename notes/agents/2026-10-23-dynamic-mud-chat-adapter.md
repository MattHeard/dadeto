# Dynamic MUD billed chat adapter

- Unexpected hurdle: the new browser adapter test initially could not create the repository's shared Jest lock directory under `/tmp` because this workspace exposes a read-only system temp mount.
- Diagnosis: the Jest pool honors `DADETO_JEST_POOL_DIR`; a worktree-local directory is writable under the reviewed execution path.
- Chosen fix: keep the existing bounded DSL and runtime pure, inject the proposal/build providers from `src/browser/dynamicMud.js`, reuse the authenticated/idempotent chat controller and `AllowEffects` fetch boundary, and expose a static config gate coupled to both billing and chat flags. Tests mock the HTTP responses and never call OpenAI.
- Next-time guidance: require a dedicated funded identity and explicit environment approval before enabling either flag or running a live command. One unknown command uses two separately billed proxy requests. The current source only proves mocked orchestration; a live playtest remains open.
