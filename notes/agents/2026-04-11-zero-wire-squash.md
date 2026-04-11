# Zero Wire squash

- Surviving mutant: `Zero Wire` / mutant `124` in `src/core/cloud/mark-variant-dirty/mark-variant-dirty-core.js:619`.
- Diagnosis: the mutant hit `resolveRequestParser(optionsTyped)` in the handler factory resolution path. The optional chaining there was stale after the handler contract was tightened, because the factory is only supposed to be called with a concrete options object that already satisfies the required parser and method fields.
- Cleanup performed: tightened the `HandleRequestOptions` JSDoc so `parseRequestBody` and `allowedMethod` are required, changed `createHandleRequest(options)` to require a real options object, and removed the redundant optional chaining / undefined cast in the parser and method resolution helpers.
- Validation: ran the targeted `mark-variant-dirty` tests successfully after the cleanup.
- Takeaway: when a mutant exposes optional chaining on an internal configuration object that the factory contract already requires, tighten the JSDoc first and then delete the stale nullish guards so the agent signal stays aligned with the actual entrypoint contract.
