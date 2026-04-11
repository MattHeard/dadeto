# Byte Halo squash

- Surviving mutant: `Byte Halo` / mutant `126` in `src/core/cloud/mark-variant-dirty/mark-variant-dirty-core.js:628`.
- Diagnosis: the mutant was in the same handler configuration resolution path as `Zero Wire`, specifically the allowed-method resolution helper. The optional chaining there was stale after the handler factory contract was tightened, because `createHandleRequest(...)` now requires a concrete options object with `allowedMethod` present.
- Cleanup performed: kept the `HandleRequestOptions` contract strict, removed the redundant optional chaining from `resolveHttpMethod(optionsTyped)`, and left the allowed-method normalization as a simple required-field read.
- Validation: the full project test suite already passed after the contract cleanup that removed this stale branch shape.
- Takeaway: once the factory contract requires an option, downstream helpers should read it directly. Optional chaining in the resolution layer weakens the signal and should be removed rather than preserved.
