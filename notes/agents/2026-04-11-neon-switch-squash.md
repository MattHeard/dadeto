# Neon Switch squash

- Surviving mutant: `Neon Switch` / mutant `78` in `src/core/cloud/mark-variant-dirty/mark-variant-dirty-core.js:453`.
- Diagnosis: the mutant hit the `getRequestMethod()` helper, which was still carrying a defensive `typeof method === 'string'` guard even after the shared request contract was tightened. That made the guard read like stale normalization instead of a meaningful branch.
- Cleanup performed: tightened `types/native-http/index.d.ts` so `NativeHttpRequest.method` is required, updated the remaining handler JSDoc request shapes that still said `method?: string`, and removed the redundant string-type check from `getRequestMethod()` so it now just returns the typed request property.
- Validation: ran the full project test suite successfully after the cleanup.
- Takeaway: when a mutant exposes a guard that no longer matches the shared request contract, prefer tightening the contract and deleting the redundant branch rather than preserving defensive noise that weakens the signal for future agents.
