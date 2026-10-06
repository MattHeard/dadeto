# Chronoflow versioned save and restore

- Unexpected hurdle: the first reload journey restored the initial state because its Playwright init script cleared local storage on every navigation, including the reload under test.
- Diagnosis: the pure save codec round-tripped the exact progressed runtime state; removing the repeated init-script clear made the browser journey restore the saved tick, edited terrain, and open sluice.
- Chosen fix: persist a schema/rules/solver-versioned local save through an injected adapter. Validate fluid arrays, bounds, solid layout, edit counts, and target completion; restore every load as untimed practice and omit clock estimates and timed credit.
- Next-time guidance: use the browser test context's isolated storage for setup, and clear it only before the first navigation if a test explicitly shares a context. Keep trusted Internet time ephemeral and resynchronize after reload.
