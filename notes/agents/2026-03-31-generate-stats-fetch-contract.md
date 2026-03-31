## Hurdle

The generate-stats core still had a fallback path that allowed `fetchFn` to be omitted, even though every current caller already supplied a concrete fetch implementation.

## Diagnosis

The remaining fallback test was the only evidence keeping that branch alive. The production bootstrap already had access to a concrete `globalThis.fetch` binding, and the test fixtures already passed explicit fetch mocks.

## Fix

Removed the fallback branch from `generate-stats-core`, made `fetchFn` a required JSDoc field, and wired the production bootstrap to pass `globalThis.fetch.bind(globalThis)` directly.

## Next Time

When a dependency is already injected at every live call site, remove the fallback test first. That makes the contract change obvious and avoids leaving dead helper branches behind.
