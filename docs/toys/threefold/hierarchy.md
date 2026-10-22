# THREEFOLD semantic hierarchy exposure

`exposeHierarchy(entities, scale)` is the pure identity-selection step before a per-scale logical layout. `resolveSceneLayout(entities, scale, viewport)` composes that selection with integer-cell packing and returns both the visible layout and the full hierarchy diagnostics. Authored entities remain in the canonical world regardless of which identities the current view exposes.

## Authored fields

- `id` is a stable, unique identity.
- `parentId` places a constituent inside one authored composite.
- `expandAtScale` is required on any entity with children. It is an integer THREEFOLD scale from −4 through +4.

Scales at or coarser than the threshold (`scale > expandAtScale`) expose the composite and map every hidden descendant to its nearest visible composite proxy. At the threshold and finer (`scale <= expandAtScale`), the composite is hidden and its children are evaluated recursively. A nested composite can therefore remain a proxy after its own parent expands.

The function returns identity-sorted `visibleEntityIds`, `hiddenEntities` with either a visible `proxyId` or reason `expanded`, and `proxies` listing every descendant represented by each visible composite. It rejects duplicate IDs, malformed or missing parents, cycles, invalid scale thresholds, composites without thresholds, and thresholds on leaves. It never repositions, merges, deletes, or mutates canonical entities.

`resolveSceneLayout` reads semantic hierarchy only from each entity's separate `hierarchy` field. The layout's top-level `parentId` remains geometric containment. Hidden identities are omitted from the visible integer-cell layout while remaining represented in `hierarchy`; packing conflicts and viewport overflow remain explicit. The Broken Gate renderer passes the finite Mosslight world-map capacity in logical cells, including its camera origin, so an entity outside that capacity appears in `overflow` instead of silently extending the map. This is a projection diagnostic and never changes canonical geometry.

The Broken Gate renderer uses this composed resolver and preserves the prior flat-scene draw order and geometry when no semantic hierarchy is authored. No feature-specific composite hierarchy is authored yet. Silt Margin and the Tidal Archive also use the composed resolver with finite viewports projected from their authored scene bounds at the current scale. Their static scene objects and Mara are drawn from the resolved cells. Out-of-region entities remain in the report as overflow without changing canonical geometry or hydraulic simulation state.

The Tidal Archive exposes its layout diagnostics in `frame.threefold.logicalGridLayout`. Vessel outlines, transfer pipe, valve, crossing barrier, coil trace, and Mara all retain their source IDs and projected cell bounds on their screen shapes. The upper and lower water surfaces remain driven by the continuous two-chamber solver; their final screen fill is quantized to the shared eight-pixel canvas grid and identifies both its chamber cells and exact solver surface elevation. At scales −2 and −1 the full scene viewport is 30×22 and 10×7 cells respectively. Real overlaps, including Mara at the valve and the lower vessel/transfer-pipe junction, are reported as unresolved layout conflicts rather than changing canonical geometry.

Hearthgaps also resolves authored homes, the runoff culvert, controls, residents, and Mara through a finite logical-cell viewport at scales −2 and −1. Their screen geometry derives from projected cell bounds; floodwater remains a render consequence of the saved runoff choice, and out-of-region identities are reported as overflow and omitted from the frame without moving canonical scene state. The water tiles stay inside the projected culvert while preserving Brin-diversion and shared-bypass outcomes. Grainlands and Weftways still need equivalent renderer integration.

## Validation

Run `npm run test:impact -- --files test/core/browser/game/threefold-logical-grid.test.js` and `npm run check:impact:run -- --files src/core/browser/game/threefold/logical-grid.js src/core/browser/game/threefold/renderer.js test/core/browser/game/threefold-logical-grid.test.js test/core/browser/game/threefold-renderer.test.js`. Cover nested building → wall → crack exposure at coarse, exact transition, and fine scales; stable results under input permutation; complete proxy mappings; conflict and overflow propagation; invalid graphs; input immutability; the Broken Gate renderer's flat-scene geometry at each supported scale; and out-of-map viewport overflow without mutation. The Silt Margin, Tidal Archive, and Hearthgaps renderer checks also verify per-scale cell-derived screen geometry, finite viewport overflow, and unchanged hydraulic or authored state. Interaction routing and authored scale-specific assets remain separate requirements of the live THREEFOLD specification.
