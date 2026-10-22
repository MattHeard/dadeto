# THREEFOLD semantic hierarchy exposure

`exposeHierarchy(entities, scale)` is the pure identity-selection step before a per-scale logical layout. Authored entities remain in the canonical world regardless of which identities the current view exposes.

## Authored fields

- `id` is a stable, unique identity.
- `parentId` places a constituent inside one authored composite.
- `expandAtScale` is required on any entity with children. It is an integer THREEFOLD scale from −4 through +4.

Scales at or coarser than the threshold (`scale > expandAtScale`) expose the composite and map every hidden descendant to its nearest visible composite proxy. At the threshold and finer (`scale <= expandAtScale`), the composite is hidden and its children are evaluated recursively. A nested composite can therefore remain a proxy after its own parent expands.

The function returns identity-sorted `visibleEntityIds`, `hiddenEntities` with either a visible `proxyId` or reason `expanded`, and `proxies` listing every descendant represented by each visible composite. It rejects duplicate IDs, malformed or missing parents, cycles, invalid scale thresholds, composites without thresholds, and thresholds on leaves. It never repositions, merges, deletes, or mutates canonical entities.

## Validation

Run `npm run test:impact -- --files test/core/browser/game/threefold-logical-grid.test.js` and `npm run check:impact:run -- --files src/core/browser/game/threefold/logical-grid.js test/core/browser/game/threefold-logical-grid.test.js`. Cover nested building → wall → crack exposure at both exact transition scales, stable results under input permutation, complete proxy mappings, invalid graphs, and input immutability. This API defines semantic exposure only; scene registration, resolved packing, renderer consumption, interaction routing, and authored scale-specific assets remain separate requirements of the live THREEFOLD specification.
