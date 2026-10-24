import { createBrokenGateScene } from '../../../../src/core/browser/game/threefold/gatehouse.js';
import { createThreefoldBelltopsScene } from '../../../../src/core/browser/game/threefold/belltops.js';
import { createThreefoldCrownbackReachScene } from '../../../../src/core/browser/game/threefold/crownback-reach.js';
import { createThreefoldSiltMarginScene } from '../../../../src/core/browser/game/threefold/silt-margin.js';
import { createThreefoldHearthgapsScene } from '../../../../src/core/browser/game/threefold/hearthgaps.js';
import { createThreefoldSluiceScene } from '../../../../src/core/browser/game/threefold/sluice-scene.js';
import { createThreefoldWakeformShoalsScene } from '../../../../src/core/browser/game/threefold/wakeform-shoals.js';
import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';
import { drawGameFrame } from '../../../../src/core/browser/game/mosslight-valley/renderer.js';
import {
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/save.js';
import { createScaleState } from '../../../../src/core/browser/game/threefold/spatial.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';

const THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

/**
 *
 * @param episode
 */
/**
 * Create a settled withdrawal with optional prior episode outcomes.
 * @param {{passengers?: 'aboard'|'partial'|'evacuated'|'lost', ferry?: 'afloat'|'lost', latchfolk?: 'unwarned'|'warned'|'safe'|'lost'}} [episode] Prior outcomes to preserve.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Withdrawn simulation.
 */
function createWithdrawnSimulation(episode = {}) {
  const scene = createBrokenGateScene();
  const road = scene.interactables.find(item => item.id === 'upland-road-exit');
  scene.spawn = createScaleState(road.position);
  const initial = createThreefoldSimulation(THRESHOLDS, scene);
  return stepThreefoldSimulation(
    { ...initial, episode: { ...initial.episode, ...episode } },
    { type: 'interact' }
  );
}

/**
 *
 * @param scene
 */
/**
 * List authored Hearthgaps identities, including the player.
 * @param {ReturnType<typeof createThreefoldHearthgapsScene>} scene Authored scene.
 * @returns {string[]} Stable entity identities.
 */
function getHearthgapsSourceIds(scene) {
  return [
    ...scene.geometry,
    ...scene.decorations,
    ...scene.interactables,
    ...scene.creatures,
    { id: 'mara' },
  ].map(({ id }) => id);
}

/**
 *
 * @param frame
 * @param sourceIds
 */
/**
 * Verify each sprite stays within its projected logical-cell rectangle.
 * @param {ReturnType<typeof renderThreefoldFrame>} frame Rendered frame.
 * @param {string[]} sourceIds Authored entity identities.
 * @returns {void} Throws through Jest assertions when a bound is wrong.
 */
function expectHearthgapsCellContainment(frame, sourceIds) {
  const layout = frame.threefold.logicalGridLayout;
  const entities = new Map(layout.entities.map(entity => [entity.id, entity]));
  const pitch = Math.max(
    8,
    Math.floor(
      Math.min(144 / layout.viewport.width, 72 / layout.viewport.height) / 8
    ) * 8
  );
  const originX =
    Math.round((8 + (144 - pitch * layout.viewport.width) / 2) / 8) * 8;
  const originY =
    Math.round((28 + (72 - pitch * layout.viewport.height) / 2) / 8) * 8;
  const screenBounds = ({ cellBounds }) => ({
    x: originX + (cellBounds.x - layout.viewport.x) * pitch,
    y:
      originY +
      (layout.viewport.height -
        (cellBounds.y - layout.viewport.y) -
        cellBounds.height) *
        pitch,
    width: pitch * cellBounds.width,
    height: pitch * cellBounds.height,
  });
  const sourceShapes = frame.shapes.filter(shape =>
    sourceIds.includes(shape.geometryId)
  );

  for (const shape of sourceShapes) {
    const bounds = screenBounds(entities.get(shape.geometryId));
    expect(shape.logicalCellBounds).toEqual(
      entities.get(shape.geometryId).cellBounds
    );
    expect(shape.x % (shape.spriteGridSize || 8)).toBe(0);
    expect(shape.y % (shape.spriteGridSize || 8)).toBe(0);
    expect(shape.x).toBeGreaterThanOrEqual(bounds.x);
    expect(shape.y).toBeGreaterThanOrEqual(bounds.y);
    expect(shape.x + shape.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(shape.y + shape.height).toBeLessThanOrEqual(
      bounds.y + bounds.height
    );
  }

  const culvert = frame.shapes.find(
    shape => shape.geometryId === 'hearthgaps-culvert'
  );
  for (const water of frame.shapes.filter(
    shape => shape.fill === '#25a9b8' && !shape.geometryId
  )) {
    expect(water.x).toBeGreaterThanOrEqual(culvert.x);
    expect(water.y).toBeGreaterThanOrEqual(culvert.y);
    expect(water.x + water.width).toBeLessThanOrEqual(
      culvert.x + culvert.width
    );
    expect(water.y + water.height).toBeLessThanOrEqual(
      culvert.y + culvert.height
    );
  }
}

/**
 *
 */
/**
 * Build a Hearthgaps state whose authored entities exceed its finite viewport.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Overflow fixture.
 */
function createOverflowedHearthgapsState() {
  const state = createThreefoldSimulation(
    THRESHOLDS,
    createThreefoldHearthgapsScene()
  );
  const moveOutOfRegion = entity => {
    entity.bounds.min.x = 20;
    entity.bounds.max.x = 21;
  };
  state.scene.geometry.forEach(moveOutOfRegion);
  state.scene.decorations.forEach(moveOutOfRegion);
  state.scene.interactables.forEach(moveOutOfRegion);
  state.scene.creatures.forEach(moveOutOfRegion);
  state.player.position.x = 20;
  return state;
}

/**
 *
 * @param frame
 * @param scene
 */
/**
 * Verify overflow identities are diagnosed and omitted from rendering.
 * @param {ReturnType<typeof renderThreefoldFrame>} frame Rendered frame.
 * @param {ReturnType<typeof createThreefoldSimulation>['scene']} scene Scene fixture.
 * @returns {void} Throws through Jest assertions when overflow handling fails.
 */
function expectHearthgapsOverflow(frame, scene) {
  const ids = [
    'hearthgaps-culvert',
    ...scene.geometry.map(({ id }) => id),
    ...scene.interactables.map(({ id }) => id),
    ...scene.creatures.map(({ id }) => id),
    'mara',
  ];
  const overflow = frame.threefold.logicalGridLayout.overflow;
  expect(overflow.map(({ entityId }) => entityId)).toEqual(
    expect.arrayContaining(ids)
  );
  const overflowIds = new Set(overflow.map(({ entityId }) => entityId));
  expect(frame.shapes.some(shape => overflowIds.has(shape.geometryId))).toBe(
    false
  );
}

/**
 * Verify projected archive shapes fit their logical grid cells.
 * @param {ReturnType<typeof renderThreefoldFrame>} frame Rendered frame.
 * @param {ReturnType<typeof renderThreefoldFrame>['shapes']} gridShapes Shapes owned by logical entities.
 * @param {Map<string, ReturnType<typeof renderThreefoldFrame>['threefold']['logicalGridLayout']['entities'][number]>} entities Entity placements.
 * @returns {void} Throws when a projected shape is misaligned or escapes its cell.
 */
function expectSluiceShapesWithinGrid(frame, gridShapes, entities) {
  for (const shape of frame.shapes.filter(shape => shape.type === 'rect')) {
    expect(shape.width % (shape.spriteGridSize || 8)).toBe(0);
    expect(shape.height % (shape.spriteGridSize || 8)).toBe(0);
  }
  for (const shape of gridShapes) {
    const entity = entities.get(shape.geometryId);
    expect(shape.logicalCellBounds).toEqual(entity.cellBounds);
    const gridSize = shape.spriteGridSize || 8;
    expect(shape.x % gridSize).toBe(0);
    expect(shape.y % gridSize).toBe(0);
  }
  for (const fluid of frame.shapes.filter(shape => shape.fluidChamberId)) {
    expect(fluid.surfaceMeters).toBeGreaterThanOrEqual(0);
    expect(fluid.logicalContainerBounds).toEqual(
      entities.get(fluid.fluidChamberId).cellBounds
    );
  }
}

describe('THREEFOLD canvas grid', () => {
  test('snaps both scenes to an eight-pixel logical grid without changing fluid state', () => {
    const brokenGate = createThreefoldSimulation(THRESHOLDS);
    const sluice = createThreefoldSimulation(
      THRESHOLDS,
      createThreefoldSluiceScene()
    );
    const fluidBeforeRender = JSON.parse(JSON.stringify(sluice.sluicePuzzle));

    for (const state of [brokenGate, sluice]) {
      const frame = renderThreefoldFrame(state);
      expect(frame).toMatchObject({ width: 160, height: 144, pixelated: true });
      for (const shape of frame.shapes) {
        const gridSize = shape.spriteGridSize || 8;
        expect(shape.x % gridSize).toBe(0);
        expect(shape.y % gridSize).toBe(0);
        if (shape.type === 'rect') {
          expect(shape.width % gridSize).toBe(0);
          expect(shape.height % gridSize).toBe(0);
        }
      }
    }

    expect(sluice.sluicePuzzle).toEqual(fluidBeforeRender);
  });

  test('renders Tidal Archive structures and Mara from its finite logical-cell layout', () => {
    const base = createThreefoldSimulation(
      THRESHOLDS,
      createThreefoldSluiceScene()
    );
    const authoredBefore = JSON.stringify({
      geometry: base.scene.geometry,
      decorations: base.scene.decorations,
      interactables: base.scene.interactables,
      puzzle: base.sluicePuzzle,
    });

    for (const scale of [-2, -1]) {
      const state = {
        ...base,
        player: { ...base.player, scale },
      };
      const frame = renderThreefoldFrame(state);
      const layout = frame.threefold.logicalGridLayout;
      const entities = new Map(
        layout.entities.map(entity => [entity.id, entity])
      );
      const projectedIds = [
        ...base.scene.geometry,
        ...base.scene.decorations,
        ...base.scene.interactables,
        { id: 'mara' },
      ].map(({ id }) => id);
      const gridShapes = frame.shapes.filter(shape =>
        projectedIds.includes(shape.geometryId)
      );

      expect(layout.scale).toBe(scale);
      expect(layout.viewport).toMatchObject({
        x: 0,
        y: 0,
        width: scale === -2 ? 30 : 10,
        height: scale === -2 ? 22 : 7,
      });
      expect(layout.overflow).toEqual([]);
      expect(layout.conflicts).toEqual([]);
      expect(
        layout.entities.every(({ placement }) => placement === 'placed')
      ).toBe(true);
      expect([...entities.keys()].sort()).toEqual([...projectedIds].sort());
      expect(gridShapes.map(shape => shape.geometryId)).toEqual(
        expect.arrayContaining(projectedIds)
      );
      expectSluiceShapesWithinGrid(frame, gridShapes, entities);
      expect(renderThreefoldFrame(state).threefold.logicalGridLayout).toEqual(
        layout
      );
      expectSluiceLayoutStableUnderPermutation(state, layout);
    }

    const outside = createThreefoldSimulation(
      THRESHOLDS,
      createThreefoldSluiceScene()
    );
    outside.scene.decorations[0].bounds.max.x = 20;
    const outsideBefore = JSON.stringify(outside.scene.decorations);
    const outsideFrame = renderThreefoldFrame(outside);
    expect(outsideFrame.threefold.logicalGridLayout.overflow).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityId: 'sluice-upper-vessel' }),
      ])
    );
    expect(JSON.stringify(outside.scene.decorations)).toBe(outsideBefore);
    expect(
      JSON.stringify({
        geometry: base.scene.geometry,
        decorations: base.scene.decorations,
        interactables: base.scene.interactables,
        puzzle: base.sluicePuzzle,
      })
    ).toBe(authoredBefore);

    const missingValveScene = createThreefoldSluiceScene();
    missingValveScene.interactables = missingValveScene.interactables.filter(
      ({ id }) => id !== 'sluice-service-valve'
    );
    expect(() =>
      renderThreefoldFrame(
        createThreefoldSimulation(THRESHOLDS, missingValveScene)
      )
    ).toThrow('Tidal Archive render entity is missing: sluice-service-valve');

    let flowing = stepThreefoldSimulation(base, { type: 'interact' });
    flowing = stepThreefoldSimulation(flowing, {
      type: 'wait',
      elapsedGameMinutes: 15,
    });
    const flowingFrame = renderThreefoldFrame(flowing);
    const lowerWater = flowingFrame.shapes.find(
      shape => shape.fluidChamberId === 'sluice-lower-vessel'
    );
    expect(lowerWater.surfaceMeters).toBeGreaterThan(
      renderThreefoldFrame(base).shapes.find(
        shape => shape.fluidChamberId === 'sluice-lower-vessel'
      ).surfaceMeters
    );
    expect(flowingFrame.threefold.logicalGridLayout).toEqual(
      renderThreefoldFrame(flowing).threefold.logicalGridLayout
    );
  });

  /**
   * @param {ReturnType<typeof createThreefoldSimulation>} state Archive state.
   * @param {ReturnType<typeof renderThreefoldFrame>['threefold']['logicalGridLayout']} layout Expected layout.
   * @returns {void} Verifies input-order independence.
   */
  function expectSluiceLayoutStableUnderPermutation(state, layout) {
    const permuted = {
      ...state,
      scene: {
        ...state.scene,
        geometry: [...state.scene.geometry].reverse(),
        decorations: [...state.scene.decorations].reverse(),
        interactables: [...state.scene.interactables].reverse(),
      },
    };
    expect(renderThreefoldFrame(permuted).threefold.logicalGridLayout).toEqual(
      layout
    );
  }

  test('renders baseline structures from scale-local logical cells without mutating geometry', () => {
    const base = createThreefoldSimulation(THRESHOLDS);
    const before = JSON.stringify({
      geometry: base.scene.geometry,
      interactables: base.scene.interactables,
      creatures: base.scene.creatures,
    });
    const layouts = [-1, 0].map(scale => {
      const state = {
        ...base,
        player: { ...base.player, scale },
      };
      const frame = renderThreefoldFrame(state);
      const layout = frame.threefold.logicalGridLayout;
      const byId = new Map(layout.entities.map(entity => [entity.id, entity]));
      const renderedEntities = frame.shapes.filter(shape =>
        byId.has(shape.geometryId)
      );

      expect(layout.scale).toBe(scale);
      expect(layout.hierarchy.visibleEntityIds).toEqual(
        layout.entities.map(entity => entity.id).sort()
      );
      expect(layout.entities.map(entity => entity.logicalGridKind)).toEqual(
        expect.arrayContaining(['structure', 'interactable', 'creature'])
      );
      expect(layout.conflicts).toEqual([]);
      expect(
        layout.entities.every(({ placement }) => placement === 'placed')
      ).toBe(true);
      for (const conflict of layout.conflicts)
        for (const id of conflict.entityIds)
          expect(byId.get(id).placement).toBe('unresolved');
      expect(renderedEntities.length).toBeGreaterThan(0);
      for (const shape of renderedEntities.filter(shape => !shape.npcMarker)) {
        const entity = byId.get(shape.geometryId);
        expect(shape.logicalCellBounds).toEqual(entity.cellBounds);
        expect(shape.logicalGridKind).toBe(entity.logicalGridKind);
        const { x, y, width, height } = entity.cellBounds;
        const screenX = (x + 7 - frame.camera.x) * 12;
        const screenY = (y + 4 - frame.camera.y) * 12;
        const left = Math.round(screenX / 8) * 8;
        const top = Math.round(screenY / 8) * 8;
        const right = left + Math.ceil((width * 12) / 8) * 8;
        const bottom = top + Math.ceil((height * 12) / 8) * 8;
        if (
          entity.logicalGridKind === 'creature' ||
          shape.spriteGridSize === 8 ||
          (shape.spriteGridSize !== undefined && shape.spriteGridSize < 8)
        ) {
          expect(shape.x).toBeGreaterThanOrEqual(left);
          expect(shape.y).toBeGreaterThanOrEqual(top);
          expect(shape.x + shape.width).toBeLessThanOrEqual(right);
          expect(shape.y + shape.height).toBeLessThanOrEqual(bottom);
        } else {
          expect(shape.x).toBe(left);
          expect(shape.y).toBe(top);
          expect(shape.width).toBe(right - left);
          expect(shape.height).toBe(bottom - top);
        }
      }
      const reversed = {
        ...state,
        scene: {
          ...state.scene,
          geometry: [...state.scene.geometry].reverse(),
          decorations: [...(state.scene.decorations ?? [])].reverse(),
          interactables: [...state.scene.interactables].reverse(),
          creatures: [...state.scene.creatures].reverse(),
        },
      };
      expect(
        renderThreefoldFrame(reversed).threefold.logicalGridLayout
      ).toEqual(layout);
      expect(state.scene.geometry).toEqual(base.scene.geometry);
      expect(state.scene.interactables).toEqual(base.scene.interactables);
      expect(state.scene.creatures).toEqual(base.scene.creatures);
      return layout;
    });

    expect(layouts[0].entities).not.toEqual(layouts[1].entities);
    expect(
      JSON.stringify({
        geometry: base.scene.geometry,
        interactables: base.scene.interactables,
        creatures: base.scene.creatures,
      })
    ).toBe(before);
  });

  test('groups authored gate and signal assemblies without hiding unrelated coarse-scale conflicts', () => {
    const base = createThreefoldSimulation(THRESHOLDS);
    const frame = renderThreefoldFrame({
      ...base,
      player: { ...base.player, scale: 1 },
    });
    const { intentionalOverlaps, conflicts } =
      frame.threefold.logicalGridLayout;
    const intentionalPairs = intentionalOverlaps.map(
      ({ entityIds }) => entityIds
    );
    const unresolvedPairs = conflicts.map(({ entityIds }) => entityIds);

    expect(intentionalPairs).toContainEqual([
      'gate-counterweight',
      'relief-gate',
    ]);
    expect(intentionalPairs).toContainEqual([
      'relief-gate',
      'relief-gate-locking-pawl',
    ]);
    expect(unresolvedPairs).not.toContainEqual([
      'drainage-weir',
      'ferry-mooring-line',
    ]);
    const packed = new Map(
      frame.threefold.logicalGridLayout.entities.map(entity => [
        entity.id,
        entity.cellBounds,
      ])
    );
    const weir = packed.get('drainage-weir');
    const line = packed.get('ferry-mooring-line');
    expect(
      weir.x + weir.width <= line.x ||
        line.x + line.width <= weir.x ||
        weir.y + weir.height <= line.y ||
        line.y + line.height <= weir.y
    ).toBe(true);
    expect(unresolvedPairs).not.toContainEqual([
      'relief-gate',
      'gate-counterweight',
    ]);
  });

  test('uses the signal station as a coarse proxy and exposes its console at scale -2', () => {
    const base = createThreefoldSimulation(THRESHOLDS);
    const before = JSON.stringify(base);
    const coarse = renderThreefoldFrame({
      ...base,
      player: { ...base.player, scale: -1 },
    });
    const fine = renderThreefoldFrame({
      ...base,
      player: { ...base.player, scale: -2 },
    });

    expect(coarse.threefold.logicalGridLayout.hierarchy).toMatchObject({
      visibleEntityIds: expect.arrayContaining(['signal-station']),
      hiddenEntities: expect.arrayContaining([
        {
          id: 'signal-station-console',
          proxyId: 'signal-station',
          reason: 'proxied',
        },
      ]),
      proxies: expect.arrayContaining([
        { id: 'signal-station', childIds: ['signal-station-console'] },
      ]),
    });
    expect(coarse.world.map.objects.map(object => object.id)).toContain(
      'signal-station'
    );
    expect(coarse.world.map.objects.map(object => object.id)).not.toContain(
      'signal-station-console'
    );
    expect(
      fine.threefold.logicalGridLayout.hierarchy.visibleEntityIds
    ).toContain('signal-station-console');
    expect(
      fine.threefold.logicalGridLayout.hierarchy.hiddenEntities
    ).toContainEqual({
      id: 'signal-station',
      proxyId: null,
      reason: 'expanded',
    });
    expect(fine.world.map.objects.map(object => object.id)).toContain(
      'signal-station-console'
    );
    expect(fine.world.map.objects.map(object => object.id)).not.toContain(
      'signal-station'
    );
    expect(JSON.stringify(base)).toBe(before);
  });

  test('resolves authored geometry composites outside the signal-station map', () => {
    const base = createThreefoldSimulation(THRESHOLDS);
    const compositeGeometry = [
      {
        id: 'authored-house',
        bounds: {
          min: { x: 9, y: 4, z: 0 },
          max: { x: 10, y: 5, z: 2 },
        },
        hierarchy: { expandAtScale: -2 },
      },
      {
        id: 'authored-house-wall',
        bounds: {
          min: { x: 9.25, y: 4.25, z: 0 },
          max: { x: 9.75, y: 4.75, z: 1 },
        },
        hierarchy: { parentId: 'authored-house' },
      },
    ];
    const state = {
      ...base,
      scene: {
        ...base.scene,
        geometry: [...base.scene.geometry, ...compositeGeometry],
      },
    };
    const before = JSON.stringify(state);
    const coarse = renderThreefoldFrame({
      ...state,
      player: { ...state.player, scale: -1 },
    });
    const fine = renderThreefoldFrame({
      ...state,
      player: { ...state.player, scale: -2 },
    });

    expect(coarse.threefold.logicalGridLayout.hierarchy).toMatchObject({
      visibleEntityIds: expect.arrayContaining(['authored-house']),
      hiddenEntities: expect.arrayContaining([
        {
          id: 'authored-house-wall',
          proxyId: 'authored-house',
          reason: 'proxied',
        },
      ]),
    });
    expect(coarse.world.map.objects.map(object => object.id)).toContain(
      'authored-house'
    );
    expect(coarse.world.map.objects.map(object => object.id)).not.toContain(
      'authored-house-wall'
    );
    expect(fine.threefold.logicalGridLayout.hierarchy).toMatchObject({
      visibleEntityIds: expect.arrayContaining(['authored-house-wall']),
      hiddenEntities: expect.arrayContaining([
        { id: 'authored-house', proxyId: null, reason: 'expanded' },
      ]),
    });
    expect(fine.world.map.objects.map(object => object.id)).toContain(
      'authored-house-wall'
    );
    expect(fine.world.map.objects.map(object => object.id)).not.toContain(
      'authored-house'
    );
    expect(JSON.stringify(state)).toBe(before);
    expect(state.scene.geometry.slice(-2)).toEqual(compositeGeometry);

    const houseDestroyed = renderThreefoldFrame({
      ...state,
      player: { ...state.player, destroyedGeometryIds: ['authored-house'] },
    });
    const wallDestroyed = renderThreefoldFrame({
      ...state,
      player: {
        ...state.player,
        destroyedGeometryIds: ['authored-house-wall'],
      },
    });

    expect(houseDestroyed.world.map.objects.map(object => object.id)).toContain(
      'authored-house-wall'
    );
    expect(wallDestroyed.world.map.objects.map(object => object.id)).toContain(
      'authored-house'
    );
  });

  test('bounds every supported Broken Gate layout to its scale-local map viewport', () => {
    const base = createThreefoldSimulation(THRESHOLDS);

    for (const scale of [-2, -1, 0, 1]) {
      const frame = renderThreefoldFrame({
        ...base,
        player: { ...base.player, scale },
      });

      expect(frame.threefold.logicalGridLayout.scale).toBe(scale);
      expect(frame.threefold.logicalGridLayout.overflow).toEqual([]);
    }
  });
});

describe('THREEFOLD scene-authored station hierarchy', () => {
  test('renderer visibility follows the Broken Gate scene expansion scale', () => {
    const scene = createBrokenGateScene();
    scene.geometry.find(({ id }) => id === 'signal-station').hierarchy = {
      expandAtScale: -1,
    };
    const state = createThreefoldSimulation(THRESHOLDS, scene);

    const frame = renderThreefoldFrame({
      ...state,
      player: { ...state.player, scale: -1 },
    });

    expect(
      frame.threefold.logicalGridLayout.hierarchy.visibleEntityIds
    ).toContain('signal-station-console');
    expect(
      frame.threefold.logicalGridLayout.hierarchy.hiddenEntities
    ).toContainEqual({
      id: 'signal-station',
      proxyId: null,
      reason: 'expanded',
    });
  });
});

describe('THREEFOLD Hearthgaps logical grid', () => {
  test('renders homes, controls and Mara from finite logical cells', () => {
    const base = createThreefoldSimulation(
      THRESHOLDS,
      createThreefoldHearthgapsScene()
    );
    const sceneBefore = JSON.stringify(base.scene);
    const sourceIds = getHearthgapsSourceIds(base.scene);

    for (const scale of [-2, -1]) {
      const state = { ...base, player: { ...base.player, scale } };
      const frame = renderThreefoldFrame(state);
      const { logicalGridLayout: layout } = frame.threefold;
      expect(layout.scale).toBe(scale);
      expect(layout.overflow).toEqual([]);
      expect(layout.conflicts).toEqual([]);
      expect(
        layout.entities.every(({ placement }) => placement === 'placed')
      ).toBe(true);
      expect(layout.entities.map(({ id }) => id).sort()).toEqual(
        [...sourceIds].sort()
      );
      expect(frame.shapes.map(({ geometryId }) => geometryId)).toEqual(
        expect.arrayContaining(sourceIds)
      );
      expectHearthgapsCellContainment(frame, sourceIds);
      for (const shape of frame.shapes.filter(shape => shape.type === 'rect')) {
        expect(shape.width % (shape.spriteGridSize || 8)).toBe(0);
        expect(shape.height % (shape.spriteGridSize || 8)).toBe(0);
      }
      expect(renderThreefoldFrame(state).threefold.logicalGridLayout).toEqual(
        layout
      );

      const reorderedState = {
        ...state,
        scene: {
          ...state.scene,
          geometry: [...state.scene.geometry].reverse(),
          decorations: [...state.scene.decorations].reverse(),
          interactables: [...state.scene.interactables].reverse(),
          creatures: [...state.scene.creatures].reverse(),
        },
      };
      expect(
        renderThreefoldFrame(reorderedState).threefold.logicalGridLayout
      ).toEqual(layout);

      const cellsById = new Map(
        layout.entities.map(entity => [entity.id, entity.cellBounds])
      );
      const culvert = cellsById.get('hearthgaps-culvert');
      for (const controlId of [
        'hearthgaps-brin-runoff-gate',
        'hearthgaps-shared-bypass',
      ])
        expect(cellsById.get(controlId).y).toBe(culvert.y);
      expect(cellsById.get('mara').y).toBe(culvert.y);
      expect(layout.intentionalOverlaps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            groupId: 'hearthgaps-runoff-flow',
            entityIds: expect.arrayContaining([
              'hearthgaps-brin-runoff-gate',
              'hearthgaps-culvert',
            ]),
          }),
        ])
      );
    }

    const diverted = {
      ...base,
      hearthgaps: {
        runoffChoice: 'brin-diversion',
        floodedHomeIds: ['hearthgaps-downstream-homes'],
      },
    };
    const divertedFrame = renderThreefoldFrame(diverted);
    expect(divertedFrame.threefold.runoffChoice).toBe('brin-diversion');
    expect(divertedFrame.shapes).toContainEqual(
      expect.objectContaining({
        geometryId: 'hearthgaps-downstream-homes',
        fill: '#25a9b8',
      })
    );

    const outside = createOverflowedHearthgapsState();
    const outsideBefore = JSON.stringify(outside.scene);
    const outsideFrame = renderThreefoldFrame(outside);
    expectHearthgapsOverflow(outsideFrame, outside.scene);
    expect(JSON.stringify(outside.scene)).toBe(outsideBefore);
    expect(JSON.stringify(base.scene)).toBe(sceneBefore);
  });
});

describe('THREEFOLD canvas grid', () => {
  test('packs an out-of-viewport object into the rendered map without moving physical geometry', () => {
    const base = createThreefoldSimulation(THRESHOLDS);
    const scene = {
      ...base.scene,
      geometry: base.scene.geometry.map(object =>
        object.id === 'gatehouse-west-wall'
          ? {
              ...object,
              bounds: {
                min: { ...object.bounds.min, x: 100 },
                max: { ...object.bounds.max, x: 101 },
              },
            }
          : object
      ),
    };
    const state = { ...base, scene };
    const before = JSON.stringify(state.scene.geometry);

    const frame = renderThreefoldFrame(state);
    const layoutEntity = frame.threefold.logicalGridLayout.entities.find(
      entity => entity.id === 'gatehouse-west-wall'
    );

    expect(frame.threefold.logicalGridLayout.overflow).toEqual([]);
    expect(layoutEntity.placement).toBe('placed');
    expect(JSON.stringify(state.scene.geometry)).toBe(before);
  });
});

describe('THREEFOLD status display', () => {
  test('uses the shared pixelated 160x144 frame and exposes current status', () => {
    const state = createThreefoldSimulation(THRESHOLDS);
    const frame = renderThreefoldFrame(state);

    expect(frame).toMatchObject({
      type: 'threefold',
      width: 160,
      height: 144,
      pixelated: true,
      quest: 'The Broken Gate',
      threefold: {
        scale: 0,
        heightMeters: 1.8288,
        anchor: 8,
        maximumAnchor: 8,
        crisisStage: 'rising',
        elapsedMinutes: 0,
      },
    });
    expect(frame.dialogue).toBeNull();
    expect(frame.toast).toBe(
      'INVESTIGATE THE FAILING GATE. DECIDE HOW TO RESPOND.'
    );
    expect(frame.presentation.status).toContain('SCALE 0 · 1.83 m · A 8/8');
    expect(frame.shapes.some(shape => shape.actorId === 'mara')).toBe(true);
    expect(frame.threefold.tideProgress).toBe(0);
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({
        type: 'rect',
        x: 128,
        y: 8,
        width: 32,
        height: 8,
        fill: '#315744',
      })
    );
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({
        type: 'rect',
        x: 128,
        y: 8,
        width: 0,
        height: 8,
        fill: '#bfd77c',
      })
    );
  });

  test('shows scale, physical height, and Anchor in every route HUD row', () => {
    const states = [
      createThreefoldSimulation(THRESHOLDS),
      createThreefoldSimulation(THRESHOLDS, createThreefoldSluiceScene()),
      createThreefoldSimulation(THRESHOLDS, createThreefoldSiltMarginScene()),
      createThreefoldSimulation(THRESHOLDS, createThreefoldBelltopsScene()),
      createThreefoldSimulation(
        THRESHOLDS,
        createThreefoldCrownbackReachScene()
      ),
      createThreefoldSimulation(
        THRESHOLDS,
        createThreefoldWakeformShoalsScene()
      ),
    ];
    const frames = states.map(renderThreefoldFrame);
    const grownShoals = stepThreefoldSimulation(states.at(-1), {
      type: 'grow',
    });
    frames.push(renderThreefoldFrame(grownShoals));

    expect(frames.map(frame => frame.presentation.status)).toEqual([
      'SCALE 0 · 1.83 m · A 8/8',
      'SCALE -2 · 20.32 cm · A 8/8',
      'SCALE -4 · 2.26 cm · A 8/8',
      'SCALE +2 · 16.46 m · A 8/8',
      'SCALE +3 · 49.38 m · A 8/8',
      'SCALE +3 · 49.38 m · A 8/8',
      'SCALE +4 · 148.13 m · A 7/8',
    ]);
    frames.forEach(frame =>
      expect(frame.presentation.status.length).toBeLessThanOrEqual(30)
    );
    expect(frames[1].toast).toContain('WATER FOLLOWS SIM TIME');
  });
});

describe('THREEFOLD Mosslight handheld frame', () => {
  test('renders the authored rat and names fight/bypass when it is in reach', () => {
    const scene = createBrokenGateScene();
    scene.spawn = createScaleState({ x: 3.15, y: 4 }, { scale: -1 });
    const state = stepThreefoldSimulation(
      createThreefoldSimulation(THRESHOLDS, scene),
      { type: 'shrink' }
    );
    const frame = renderThreefoldFrame(state);

    expect(frame.world.map.objects.map(object => object.id)).toContain(
      'gatehouse-rat'
    );
    expect(
      frame.shapes.filter(shape => shape.geometryId === 'gatehouse-rat')
    ).toHaveLength(4);
    expect(frame.threefold.ratFate).toBe('present');
    expect(frame.quickAction).toBe('fight');
    expect(frame.toast).toContain('RAT IN REACH · A FIGHT · X BYPASS');
  });

  test('previews the geometry destroyed by growth without changing the simulation', () => {
    const state = createThreefoldSimulation(THRESHOLDS);
    const originalState = JSON.parse(JSON.stringify(state));
    const frame = renderThreefoldFrame(state);
    const westWall = frame.shapes.find(
      shape => shape.geometryId === 'gatehouse-west-wall'
    );

    expect(frame.threefold.growthPreviewIds).toEqual(['gatehouse-west-wall']);
    expect(westWall).toMatchObject({ fill: '#e16b5a', growthPreview: true });
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({
        type: 'text',
        text: 'A BREAKS WEST WALL',
        fill: '#e16b5a',
      })
    );
    expect(state).toEqual(originalState);
    expect(
      stepThreefoldSimulation(state, { type: 'grow' }).player
        .destroyedGeometryIds
    ).toEqual(frame.threefold.growthPreviewIds);
  });

  test('keeps the regular status when the next growth step hits no geometry', () => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const state = {
      ...initial,
      player: { ...initial.player, position: { x: 0, y: 0 } },
    };
    const frame = renderThreefoldFrame(state);

    expect(frame.threefold.growthPreviewIds).toEqual([]);
    expect(frame.toast).toBe(
      'INVESTIGATE THE FAILING GATE. DECIDE HOW TO RESPOND.'
    );
    expect(frame.shapes.some(shape => shape.growthPreview === true)).toBe(
      false
    );
  });

  test('renders the reachable rat as pixels and omits it after a terminal fate', () => {
    const scene = createBrokenGateScene();
    scene.spawn = createScaleState(
      { x: 3.158, y: 4 },
      {
        scale: -2,
        anchor: 6,
        minimumUnlockedScale: -2,
        maximumUnlockedScale: 1,
      }
    );
    const state = createThreefoldSimulation(THRESHOLDS, scene);
    state.crisis.elapsedMinutes = 0.25;

    const nearby = renderThreefoldFrame(state);
    expect(nearby.toast).toContain('RAT IN REACH · A FIGHT · X BYPASS');
    expect(nearby.toast).toContain('A WARN/RESCUE');
    expect(nearby.threefold.ratFate).toBe('present');
    expect(nearby.world.map.objects.map(({ id }) => id)).toContain(
      'gatehouse-rat'
    );
    expect(
      nearby.shapes.filter(shape => shape.geometryId === 'gatehouse-rat')
    ).toHaveLength(4);

    const ended = renderThreefoldFrame({
      ...state,
      encounter: { ratFate: 'killed' },
    });
    expect(ended.world.map.objects.map(({ id }) => id)).not.toContain(
      'gatehouse-rat'
    );
  });

  test('culls the rat sprite when its physical position is outside the frame', () => {
    const scene = createBrokenGateScene();
    scene.spawn = createScaleState(
      { x: 11.9, y: 8.9 },
      {
        scale: -2,
        anchor: 8,
        minimumUnlockedScale: -2,
        maximumUnlockedScale: 1,
      }
    );
    const frame = renderThreefoldFrame(
      createThreefoldSimulation(THRESHOLDS, scene)
    );

    expect(
      frame.shapes.filter(shape => shape.geometryId === 'gatehouse-rat')
    ).toHaveLength(0);
  });

  test('keeps Mara fixed while the same geometry scales inversely by three', () => {
    const humanScale = renderThreefoldFrame(
      createThreefoldSimulation(THRESHOLDS)
    );
    const scene = createBrokenGateScene();
    scene.spawn = createScaleState(scene.spawn.position, {
      scale: -1,
      anchor: 8,
      maximumAnchor: 8,
      minimumUnlockedScale: -2,
      maximumUnlockedScale: 1,
    });
    const smallerScale = renderThreefoldFrame(
      createThreefoldSimulation(THRESHOLDS, scene)
    );
    const avatarBounds = frameBounds(humanScale.shapes, 'actorId', 'mara');
    const smallerAvatarBounds = frameBounds(
      smallerScale.shapes,
      'actorId',
      'mara'
    );
    const wall = humanScale.shapes.find(
      shape => shape.geometryId === 'gatehouse-west-wall'
    );
    const smallerWall = smallerScale.shapes.find(
      shape => shape.geometryId === 'gatehouse-west-wall'
    );

    expect(smallerAvatarBounds).toEqual(avatarBounds);
    expect(smallerWall.width * smallerWall.height).toBeGreaterThan(
      wall.width * wall.height
    );
    expect(
      humanScale.threefold.heightMeters / smallerScale.threefold.heightMeters
    ).toBeCloseTo(3);
  });

  test('omits geometry already destroyed by growth and shows the updated tide stage', () => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const grown = {
      ...initial,
      player: {
        ...initial.player,
        scale: 1,
        destroyedGeometryIds: ['gatehouse-west-wall'],
      },
      crisis: {
        ...initial.crisis,
        elapsedMinutes: 9,
        stage: 'surge',
      },
    };
    const frame = renderThreefoldFrame(grown);

    expect(frame.world.map.objects.map(object => object.id)).not.toContain(
      'gatehouse-west-wall'
    );
    expect(frame.threefold).toMatchObject({ scale: 1, crisisStage: 'surge' });
    expect(frame.dialogue).toBeNull();
    expect(frame.presentation.status).toBe('SCALE +1 · 5.49 m · A 8/8');
    expect(frame.toast).toContain('SURGE');
    expect(frame.threefold.tideProgress).toBe(0.6);
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({
        type: 'rect',
        x: 128,
        y: 8,
        width: 16,
        height: 8,
        fill: '#e16b5a',
      })
    );
  });

  test('shows the lower-channel warning, then renders the flooded settlement', () => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const atRisk = {
      ...initial,
      player: {
        ...initial.player,
        destroyedGeometryIds: ['relief-gate'],
      },
      crisis: {
        ...initial.crisis,
        elapsedMinutes: 4,
        stage: 'urgent',
      },
    };

    const warning = renderThreefoldFrame(atRisk);
    expect(warning.threefold).toMatchObject({
      gateState: 'forced-open',
      drainageState: 'at-risk',
    });
    expect(warning.toast).toContain('LOWER CHANNEL AT RISK');
    expect(warning.world.map.objects.map(object => object.id)).not.toContain(
      'drainage-floodwater'
    );

    const surge = {
      ...atRisk,
      crisis: { ...atRisk.crisis, elapsedMinutes: 9, stage: 'surge' },
    };
    const flooded = renderThreefoldFrame(surge);

    expect(flooded.threefold.drainageState).toBe('flooded');
    expect(flooded.toast).toContain('LOWER CHANNEL FLOODED');
    expect(flooded.world.map.objects.map(object => object.id)).toContain(
      'drainage-floodwater'
    );
    expect(flooded.shapes).toContainEqual(
      expect.objectContaining({
        geometryId: 'drainage-floodwater',
        fill: '#25a9b8',
      })
    );
  });

  test('shows the repaired gate and receding lower water after ferry loss', () => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const repaired = {
      ...initial,
      player: {
        ...initial.player,
        scale: -2,
        destroyedGeometryIds: ['gatehouse-west-wall'],
      },
      crisis: { ...initial.crisis, elapsedMinutes: 9, stage: 'surge' },
      episode: {
        ...initial.episode,
        passengers: 'lost',
        ferry: 'lost',
        latchfolk: 'lost',
        gateRepaired: true,
      },
    };
    const flooded = renderThreefoldFrame(repaired);

    expect(flooded.threefold).toMatchObject({
      gateState: 'repaired',
      drainageState: 'flooded',
      gateRepaired: true,
    });
    expect(flooded.toast).toContain('LOWER CHANNEL STILL FLOODED');
    expect(flooded.world.map.objects.map(object => object.id)).toContain(
      'relief-gate'
    );
    expect(flooded.world.map.objects.map(object => object.id)).toContain(
      'relief-gate-locking-pawl'
    );
    expect(flooded.world.map.objects.map(object => object.id)).toContain(
      'drainage-floodwater'
    );

    const aftermathState = {
      ...repaired,
      crisis: { ...repaired.crisis, elapsedMinutes: 15, stage: 'aftermath' },
    };
    const aftermath = renderThreefoldFrame(aftermathState);
    expect(aftermath.threefold.drainageState).toBe('receded');
    expect(aftermath.toast).toContain('LOWER WATER RECEDED');
    expect(aftermath.world.map.objects.map(object => object.id)).not.toContain(
      'drainage-floodwater'
    );
    const reportedAfterRepair = renderThreefoldFrame({
      ...aftermathState,
      episode: { ...aftermathState.episode, closedBy: 'reported' },
    });
    expect(reportedAfterRepair.threefold.episodeEpilogue.paragraphs).toContain(
      'Floodwater recedes from the lower channel during aftermath.'
    );
  });

  test('reports a flooded lower channel in the post-storm epilogue', () => {
    const initial = createThreefoldSimulation(
      THRESHOLDS,
      createBrokenGateScene()
    );
    const reported = renderThreefoldFrame({
      ...initial,
      player: {
        ...initial.player,
        destroyedGeometryIds: ['relief-gate'],
      },
      crisis: {
        ...initial.crisis,
        elapsedMinutes: THRESHOLDS.aftermathAtMinutes,
        stage: 'aftermath',
      },
      episode: {
        ...initial.episode,
        passengers: 'lost',
        ferry: 'lost',
        latchfolk: 'lost',
        closedBy: 'reported',
      },
    });

    expect(reported.threefold.episodeEpilogue.paragraphs).toContain(
      'Floodwater remains in the lower channel after the storm.'
    );
  });
});

describe('THREEFOLD Mosslight episode outcomes', () => {
  test('renders the ferry mooring and branch-specific rescue outcomes', () => {
    const scene = createBrokenGateScene();
    scene.spawn = createScaleState(scene.interactables[0].position);
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const partial = stepThreefoldSimulation(initial, { type: 'interact' });
    const partialFrame = renderThreefoldFrame(partial);

    expect(partialFrame.world.map.objects.map(object => object.id)).toContain(
      'ferry-mooring-line'
    );
    expect(partialFrame.shapes).toContainEqual(
      expect.objectContaining({ geometryId: 'ferry-mooring-line' })
    );
    expect(partialFrame.threefold).toMatchObject({
      passengers: 'partial',
      ferry: 'afloat',
    });
    expect(partialFrame.toast).toContain(
      'PASSENGERS 1/2 SAFE · 1/2 STILL ABOARD'
    );

    const rescued = stepThreefoldSimulation(partial, { type: 'interact' });
    expect(renderThreefoldFrame(rescued).toast).toContain(
      'PASSENGERS EVACUATED'
    );

    const surge = stepThreefoldSimulation(rescued, {
      type: 'wait',
      elapsedGameMinutes: 9,
    });
    expect(renderThreefoldFrame(surge).toast).toContain(
      'PASSENGERS SAFE · FERRY LOST'
    );

    const partialSurge = stepThreefoldSimulation(partial, {
      type: 'wait',
      elapsedGameMinutes: 9,
    });
    expect(renderThreefoldFrame(partialSurge).toast).toContain(
      'PASSENGERS 1/2 SAFE · 1/2 LOST'
    );
  });

  test('renders the Latchfolk warning target and branch outcome', () => {
    const scene = createBrokenGateScene();
    const watchkeeper = scene.interactables.find(
      item => item.id === 'latchfolk-watchkeeper'
    );
    scene.spawn = createScaleState(watchkeeper.position);
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const warned = stepThreefoldSimulation(initial, { type: 'interact' });
    const frame = renderThreefoldFrame(warned);

    expect(frame.world.map.objects.map(object => object.id)).toContain(
      'latchfolk-watchkeeper'
    );
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({
        geometryId: 'latchfolk-watchkeeper',
        fill: '#e16b5a',
        growthPreview: true,
      })
    );
    expect(frame.threefold.latchfolk).toBe('warned');
    expect(frame.toast).toContain('LATCHFOLK WARNED');

    const surge = stepThreefoldSimulation(warned, {
      type: 'wait',
      elapsedGameMinutes: 9,
    });
    const outcome = renderThreefoldFrame(surge);
    expect(outcome.threefold.latchfolk).toBe('safe');
    expect(outcome.toast).toContain('LATCHFOLK SAFE');
  });

  test('scales the Broken Gate watchkeeper sprite with Mara', () => {
    const scene = createBrokenGateScene();
    const watchkeeper = scene.interactables.find(
      item => item.id === 'latchfolk-watchkeeper'
    );
    scene.spawn = createScaleState(watchkeeper.position);
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const tallMara = renderThreefoldFrame({
      ...initial,
      player: { ...initial.player, scale: 0 },
    });
    const smallerMara = renderThreefoldFrame({
      ...initial,
      player: { ...initial.player, scale: -2 },
    });
    const spriteBounds = frame => {
      const pixels = frame.shapes.filter(
        shape =>
          shape.geometryId === 'latchfolk-watchkeeper' &&
          shape.npcMarker !== true
      );
      return {
        width:
          Math.max(...pixels.map(shape => shape.x + shape.width)) -
          Math.min(...pixels.map(shape => shape.x)),
        height:
          Math.max(...pixels.map(shape => shape.y + shape.height)) -
          Math.min(...pixels.map(shape => shape.y)),
      };
    };

    expect(spriteBounds(smallerMara).width).toBeGreaterThan(
      spriteBounds(tallMara).width
    );
    expect(spriteBounds(smallerMara).height).toBeGreaterThan(
      spriteBounds(tallMara).height
    );
  });

  test('keeps watchkeeper size changes visible between adjacent large scales', () => {
    const scene = createBrokenGateScene();
    const watchkeeper = scene.interactables.find(
      item => item.id === 'latchfolk-watchkeeper'
    );
    scene.spawn = createScaleState(watchkeeper.position);
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const humanScale = renderThreefoldFrame({
      ...initial,
      player: { ...initial.player, scale: 0 },
    });
    const largerMara = renderThreefoldFrame({
      ...initial,
      player: { ...initial.player, scale: 1 },
    });
    const spriteBounds = frame => {
      const pixels = frame.shapes.filter(
        shape =>
          shape.geometryId === 'latchfolk-watchkeeper' &&
          shape.npcMarker !== true
      );
      return {
        width:
          Math.max(...pixels.map(shape => shape.x + shape.width)) -
          Math.min(...pixels.map(shape => shape.x)),
        height:
          Math.max(...pixels.map(shape => shape.y + shape.height)) -
          Math.min(...pixels.map(shape => shape.y)),
      };
    };
    const largerSpritePixels = largerMara.shapes.filter(
      shape => shape.geometryId === 'latchfolk-watchkeeper'
    );

    expect(spriteBounds(humanScale).width).toBeGreaterThan(
      spriteBounds(largerMara).width
    );
    expect(spriteBounds(humanScale).height).toBeGreaterThan(
      spriteBounds(largerMara).height
    );
    expect(
      largerSpritePixels.every(
        shape =>
          shape.spriteGridSize === 2 &&
          shape.x % 2 === 0 &&
          shape.y % 2 === 0 &&
          shape.width % 2 === 0 &&
          shape.height % 2 === 0
      )
    ).toBe(true);
  });

  test('renders the upland road and persistent withdrawal outcome', () => {
    const withdrawn = createWithdrawnSimulation();
    const frame = renderThreefoldFrame(withdrawn);

    expect(frame.world.map.objects.map(object => object.id)).toContain(
      'upland-road-exit'
    );
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({
        geometryId: 'upland-road-exit',
        fill: '#f1ead0',
      })
    );
    expect(frame.threefold).toMatchObject({
      withdrawn: true,
      crisisStage: 'aftermath',
      passengers: 'lost',
      ferry: 'lost',
      latchfolk: 'lost',
    });
    expect(frame.toast).toContain('EPISODE CLOSED BY DEPARTURE');
    expect(frame.toast).toContain('PASSENGERS LOST');
    expect(frame.toast).toContain('LATCHFOLK LOST');
  });

  test('renders rescued passengers and warned Latchfolk as safe after withdrawal', () => {
    const withdrawn = createWithdrawnSimulation({
      passengers: 'evacuated',
      latchfolk: 'warned',
    });
    const frame = renderThreefoldFrame(withdrawn);

    expect(frame.toast).toBe(
      'EPISODE CLOSED BY DEPARTURE · MARA LEFT THE GATEHOUSE · PASSENGERS SAFE · LATCHFOLK SAFE'
    );
  });

  test('renders destroyed signal station and the surviving closure route', () => {
    const scene = createBrokenGateScene();
    const console = scene.interactables.find(
      item => item.id === 'signal-station-console'
    );
    scene.spawn = createScaleState(console.position);
    let state = createThreefoldSimulation(THRESHOLDS, scene);
    state = stepThreefoldSimulation(state, { type: 'grow' });
    state = stepThreefoldSimulation(state, {
      type: 'wait',
      elapsedGameMinutes: THRESHOLDS.aftermathAtMinutes,
    });

    const frame = renderThreefoldFrame(state);

    expect(frame.threefold).toMatchObject({
      signalStationDestroyed: true,
      closedBy: null,
      crisisStage: 'aftermath',
    });
    expect(frame.world.map.objects.map(object => object.id)).not.toContain(
      'signal-station-console'
    );
    expect(frame.toast).toContain('SIGNAL STATION LOST');
    expect(frame.toast).toContain('DEPART UPLAND TO CLOSE');
  });

  test('renders a filed report as the episode closure outcome', () => {
    const scene = createBrokenGateScene();
    const console = scene.interactables.find(
      item => item.id === 'signal-station-console'
    );
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const atConsole = {
      ...initial,
      player: createScaleState(console.position, { scale: -2 }),
    };
    const aftermath = stepThreefoldSimulation(atConsole, {
      type: 'wait',
      elapsedGameMinutes: THRESHOLDS.aftermathAtMinutes,
    });
    const reported = stepThreefoldSimulation(aftermath, {
      type: 'interact',
    });

    const frame = renderThreefoldFrame(reported);

    expect(frame.threefold.closedBy).toBe('reported');
    expect(frame.threefold.iriRepairLog).toEqual({
      title: "Iri's pressure-regulator log",
      text:
        'An earlier log credits Iri with an emergency pressure-regulator bypass. ' +
        'It records that downstream messages were lost, but cannot establish ' +
        'which warnings reached each settlement or what Iri understood about ' +
        'the wider consequences.',
    });
    expect(frame.threefold.iriRecordedConfession).toBeNull();
    expect(frame.threefold.episodeEpilogue).toEqual({
      title: 'Report filed',
      paragraphs: [
        'Mara files the storm report from the intact signal station.',
        'Passenger outcome: passengers lost.',
        'Latchfolk outcome: lost.',
        'Relief gate: held.',
        'The lower channel stays dry.',
      ],
    });
    expect(frame.toast).toBe(
      'EPISODE CLOSED · REPORT SENT THROUGH THE SIGNAL STATION'
    );
    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(reported)
    );
    expect(restored).not.toBeNull();
    expect(renderThreefoldFrame(restored).threefold.iriRepairLog).toEqual(
      frame.threefold.iriRepairLog
    );
    expect(renderThreefoldFrame(restored).threefold.episodeEpilogue).toEqual(
      frame.threefold.episodeEpilogue
    );
  });

  test('renders departure closure without a report after station destruction', () => {
    const scene = createBrokenGateScene();
    const road = scene.interactables.find(
      item => item.id === 'upland-road-exit'
    );
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const atRoad = {
      ...initial,
      player: createScaleState(road.position, {
        destroyedGeometryIds: ['signal-station'],
      }),
    };
    const aftermath = stepThreefoldSimulation(atRoad, {
      type: 'wait',
      elapsedGameMinutes: THRESHOLDS.aftermathAtMinutes,
    });
    const departed = stepThreefoldSimulation(aftermath, { type: 'interact' });

    const frame = renderThreefoldFrame(departed);

    expect(frame.threefold.closedBy).toBe('departed');
    expect(frame.threefold.iriRepairLog).toBeNull();
    expect(frame.threefold.episodeEpilogue).toMatchObject({
      title: 'Departure',
      paragraphs: [
        'Mara leaves by the upland road; the signal station is rubble and no report is sent.',
        'Passenger outcome: passengers lost.',
        'Latchfolk outcome: lost.',
        'Relief gate: held.',
        'The lower channel stays dry.',
      ],
    });
    expect(frame.toast).toContain('SIGNAL STATION LOST');
    expect(frame.toast).toContain('NO REPORT SENT');
    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(departed)
    );
    expect(restored).not.toBeNull();
    expect(renderThreefoldFrame(restored).threefold.episodeEpilogue).toEqual(
      frame.threefold.episodeEpilogue
    );
  });

  test('keeps Iri repair log unavailable after departure with the station intact', () => {
    const departed = createWithdrawnSimulation({
      passengers: 'evacuated',
      latchfolk: 'warned',
    });
    const frame = renderThreefoldFrame(departed);

    expect(frame.threefold).toMatchObject({
      signalStationDestroyed: false,
      closedBy: 'departed',
      iriRepairLog: null,
    });
    expect(frame.threefold.episodeEpilogue).toEqual({
      title: 'Departure',
      paragraphs: [
        'The signal station stands, but Mara leaves by the upland road without filing a report.',
        'Passenger outcome: passengers safe.',
        'Latchfolk outcome: safe.',
        'Relief gate: held.',
        'The lower channel stays dry.',
      ],
    });
  });

  test.each([
    [4, 'urgent', 8, '#e9d88d'],
    [15, 'aftermath', 32, '#e16b5a'],
  ])(
    'shows %s crisis progress in the tide meter',
    (minutes, stage, width, fill) => {
      const state = createThreefoldSimulation(THRESHOLDS);
      state.crisis.elapsedMinutes = minutes;
      state.crisis.stage = stage;

      const frame = renderThreefoldFrame(state);

      expect(frame.threefold.tideProgress).toBe(minutes / 15);
      expect(frame.shapes).toContainEqual(
        expect.objectContaining({
          type: 'rect',
          x: 128,
          y: 8,
          width,
          height: 8,
          fill,
        })
      );
    }
  );
});

describe('THREEFOLD growth preview summary', () => {
  test('previews lethal growth when Mara fits inside the authored rat', () => {
    const scene = createBrokenGateScene();
    scene.spawn = createScaleState({ x: 3.28, y: 4 }, { scale: -2 });
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const state = stepThreefoldSimulation(initial, {
      type: 'wait',
      elapsedGameMinutes: 0.25,
    });
    const frame = renderThreefoldFrame(state);
    const ratShapes = frame.shapes.filter(
      shape => shape.geometryId === 'gatehouse-rat'
    );

    expect(frame.threefold.growthPreviewCreatureIds).toEqual(['gatehouse-rat']);
    expect(frame.quickAction).toBe('grow');
    expect(frame.toast).toContain('RAT INSIDE · A GROW · X BYPASS');
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({ type: 'text', text: 'A KILLS RAT' })
    );
    expect(ratShapes.every(shape => shape.growthPreview)).toBe(true);
    expect(ratShapes.filter(shape => shape.fill === '#e16b5a')).toHaveLength(3);
  });

  test('summarizes multiple structures in the growth preview', () => {
    const scene = createBrokenGateScene();
    scene.geometry.push({
      id: 'gatehouse-west-support',
      bounds: {
        min: { x: 3.55, y: 3.4, z: 0 },
        max: { x: 3.85, y: 4.6, z: 3 },
      },
    });
    const frame = renderThreefoldFrame(
      createThreefoldSimulation(THRESHOLDS, scene)
    );

    expect(frame.threefold.growthPreviewIds).toEqual([
      'gatehouse-west-support',
      'gatehouse-west-wall',
    ]);
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({
        type: 'text',
        text: 'A BREAKS WEST SUPPORT +1',
        fill: '#e16b5a',
      })
    );
  });
});

/**
 * Measure the rendered bounds of a tagged actor or piece of geometry.
 * @param {Array<Record<string, any>>} shapes Rendered Mosslight-compatible pixel shapes.
 * @param {'actorId'|'geometryId'} property Metadata selector.
 * @param {string} id Actor or geometry identifier.
 * @returns {{x: number, y: number, width: number, height: number}|null} Tight shape bounds.
 */
function frameBounds(shapes, property, id) {
  const owned = shapes.filter(shape => shape[property] === id);
  if (owned.length === 0) return null;
  const minX = Math.min(...owned.map(shape => shape.x));
  const minY = Math.min(...owned.map(shape => shape.y));
  const maxX = Math.max(...owned.map(shape => shape.x + shape.width));
  const maxY = Math.max(...owned.map(shape => shape.y + shape.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Require the resident's magenta outline to extend at least one 2px cell beyond art.
 * @param {Array<Record<string, any>>} outline Resident outline shapes.
 * @param {Array<Record<string, any>>} art Resident sprite shapes.
 * @param {string} id Resident identity.
 * @returns {void} Throws when the bright role halo is too thin.
 */
function expectResidentHalo(outline, art, id) {
  const artBounds = frameBounds(art, 'geometryId', id);
  const outlineBounds = frameBounds(outline, 'geometryId', id);
  expect(outlineBounds.x).toBeLessThanOrEqual(artBounds.x - 4);
  expect(outlineBounds.x + outlineBounds.width).toBeGreaterThanOrEqual(
    artBounds.x + artBounds.width + 4
  );
}

/**
 * Keep the NPC badge inside the handheld and clear of every player sprite cell.
 * @param {Array<Record<string, any>>} npcLabel NPC label shapes.
 * @param {Array<Record<string, any>>} playerBody Player outline and art cells.
 * @returns {void} Throws when character identity tags overlap on screen.
 */
function expectResidentBadgeClearOfPlayer(npcLabel, playerBody) {
  const badge = npcLabel.find(shape => shape.width === 46);
  expect(badge).toBeDefined();
  expect(badge.x).toBeGreaterThanOrEqual(0);
  expect(badge.x + badge.width).toBeLessThanOrEqual(160);
  expect(badge.y).toBeGreaterThanOrEqual(0);
  expect(badge.y + badge.height).toBeLessThanOrEqual(108);
  expect(
    playerBody.every(
      shape =>
        badge.x + badge.width <= shape.x ||
        badge.x >= shape.x + (shape.width ?? 0) ||
        badge.y + badge.height <= shape.y ||
        badge.y >= shape.y + (shape.height ?? 0)
    )
  ).toBe(true);
}

describe('THREEFOLD resident identity marker', () => {
  test('draws the prepared resident role art in the shared Mosslight presenter', () => {
    const scene = createBrokenGateScene();
    const frame = renderThreefoldFrame(
      createThreefoldSimulation(THRESHOLDS, scene)
    );
    const paintedColors = [];
    const context = {
      fillStyle: '',
      imageSmoothingEnabled: true,
      fillRect() {
        paintedColors.push(this.fillStyle);
      },
    };

    drawGameFrame(context, frame);

    expect(paintedColors).toContain('#f14bd3');
  });

  test('distinguishes resident sprites from Mara on the 2px grid', () => {
    const scene = createBrokenGateScene();
    const watchkeeper = scene.interactables.find(
      item => item.id === 'latchfolk-watchkeeper'
    );
    const frame = renderThreefoldFrame(
      createThreefoldSimulation(THRESHOLDS, scene)
    );
    const residentOutline = frame.shapes.filter(
      shape =>
        shape.geometryId === watchkeeper.id && shape.npcMarkerKind === 'outline'
    );
    const npcLabel = frame.shapes.filter(
      shape =>
        shape.geometryId === watchkeeper.id &&
        shape.npcMarkerKind === 'role-label'
    );
    const residentArt = frame.shapes.filter(
      shape =>
        shape.geometryId === watchkeeper.id &&
        shape.npcMarker !== true &&
        shape.npcMarkerKind !== 'role-label'
    );
    const mara = frame.shapes.filter(shape => shape.actorId === 'mara');
    const playerLabel = mara.filter(shape => shape.playerMarker === true);
    const playerPointer = mara.filter(
      shape => shape.playerMarkerKind === 'pointer'
    );
    const playerSprite = mara.filter(shape => shape.playerMarker !== true);
    const playerBody = mara.filter(
      shape =>
        shape.playerMarker !== true && shape.playerMarkerKind !== 'pointer'
    );
    const playerOutline = mara.filter(shape => shape.fill === '#37e7ed');

    expect(residentArt.some(shape => shape.fill === '#8d4bb0')).toBe(true);
    expect(residentArt.some(shape => shape.fill === '#f14bd3')).toBe(true);
    expect(residentArt.some(shape => shape.fill === '#ffe1fa')).toBe(true);
    expect(
      residentArt.every(shape => !['#37e7ed', '#e9d88d'].includes(shape.fill))
    ).toBe(true);
    expect(residentOutline.length).toBeGreaterThan(0);
    expectResidentHalo(residentOutline, residentArt, watchkeeper.id);
    expect(
      residentOutline.every(
        shape =>
          shape.fill === '#f14bd3' &&
          shape.spriteGridSize === 2 &&
          shape.npcMarker === true
      )
    ).toBe(true);
    expect(npcLabel.length).toBeGreaterThan(0);
    expectResidentBadgeClearOfPlayer(npcLabel, playerBody);
    expect(
      npcLabel.every(
        shape =>
          ['#f14bd3', '#182f36', '#f3f6d2'].includes(shape.fill) &&
          shape.spriteGridSize === 2 &&
          shape.x % 2 === 0 &&
          shape.y % 2 === 0 &&
          shape.width % 2 === 0 &&
          shape.height % 2 === 0 &&
          shape.npcMarkerText === 'NPC'
      )
    ).toBe(true);
    expect(
      [...new Set(npcLabel.map(shape => shape.npcGlyph).filter(Boolean))].sort()
    ).toEqual(['C', 'N', 'P']);
    expect(mara.length).toBeGreaterThan(0);
    expect(playerSprite.length).toBeGreaterThan(0);
    expect(playerSprite.some(shape => shape.fill === '#37e7ed')).toBe(true);
    expect(playerSprite.some(shape => shape.fill === '#f3f6d2')).toBe(true);
    expect(
      playerSprite.some(shape => ['#f14bd3', '#8d4bb0'].includes(shape.fill))
    ).toBe(false);
    expect(
      residentArt.every(
        residentShape =>
          !playerSprite.some(
            playerShape => playerShape.fill === residentShape.fill
          )
      )
    ).toBe(true);
    expect(residentArt.some(shape => shape.fill === '#8d4bb0')).toBe(true);
    expect(
      residentArt.some(shape => ['#37e7ed', '#e9d88d'].includes(shape.fill))
    ).toBe(false);
    expect(
      playerSprite.every(
        shape =>
          shape.spriteGridSize === 2 &&
          shape.x % 2 === 0 &&
          shape.y % 2 === 0 &&
          shape.width % 2 === 0 &&
          shape.height % 2 === 0
      )
    ).toBe(true);
    expect(playerOutline.length).toBeGreaterThan(0);
    expect(
      playerOutline.every(
        shape =>
          shape.spriteGridSize === 2 &&
          shape.x % 2 === 0 &&
          shape.y % 2 === 0 &&
          shape.fill === '#37e7ed'
      )
    ).toBe(true);
    expect(playerLabel.length).toBeGreaterThan(0);
    expect(
      playerLabel.every(
        shape =>
          ['#37e7ed', '#182f36', '#f3f6d2'].includes(shape.fill) &&
          shape.spriteGridSize === 2 &&
          shape.x % 2 === 0 &&
          shape.y % 2 === 0 &&
          shape.width % 2 === 0 &&
          shape.height % 2 === 0 &&
          shape.playerMarkerText === 'YOU'
      )
    ).toBe(true);
    expect(
      [
        ...new Set(playerLabel.map(shape => shape.npcGlyph).filter(Boolean)),
      ].sort()
    ).toEqual(['O', 'U', 'Y']);
    expect(playerLabel.some(shape => npcLabel.includes(shape))).toBe(false);
    expect(playerPointer).toHaveLength(8);
    expect(
      playerPointer.map(({ x, y, width, height, fill }) => ({
        x,
        y,
        width,
        height,
        fill,
      }))
    ).toEqual([
      expect.objectContaining({ width: 30, height: 2, fill: '#37e7ed' }),
      expect.objectContaining({ width: 26, height: 2, fill: '#37e7ed' }),
      expect.objectContaining({ width: 22, height: 2, fill: '#37e7ed' }),
      expect.objectContaining({ width: 18, height: 2, fill: '#37e7ed' }),
      expect.objectContaining({ width: 14, height: 2, fill: '#37e7ed' }),
      expect.objectContaining({ width: 10, height: 2, fill: '#37e7ed' }),
      expect.objectContaining({ width: 6, height: 2, fill: '#37e7ed' }),
      expect.objectContaining({ width: 2, height: 2, fill: '#37e7ed' }),
    ]);
    expect(
      Math.max(...playerPointer.map(shape => shape.y + shape.height))
    ).toBeLessThanOrEqual(Math.min(...playerSprite.map(shape => shape.y)) + 2);
    expect(
      Math.max(...playerPointer.map(shape => shape.y + shape.height))
    ).toBeGreaterThanOrEqual(Math.min(...playerSprite.map(shape => shape.y)));
    expect(playerPointer.every(shape => shape.npcMarker !== true)).toBe(true);
    expect(
      mara.some(
        shape => shape.npcMarker !== true && shape.playerMarker !== true
      )
    ).toBe(true);
  });

  test('attaches a magenta cap to each resident and never to Mara', () => {
    const scene = createBrokenGateScene();
    const watchkeeper = scene.interactables.find(
      item => item.id === 'latchfolk-watchkeeper'
    );
    const frame = renderThreefoldFrame(
      createThreefoldSimulation(THRESHOLDS, scene)
    );
    const residentCap = frame.shapes.filter(
      shape =>
        shape.geometryId === watchkeeper.id && shape.npcMarkerKind === 'cap'
    );
    const mara = frame.shapes.filter(shape => shape.actorId === 'mara');

    expect(residentCap).toHaveLength(1);
    expect(residentCap[0]).toMatchObject({
      type: 'rect',
      height: 2,
      fill: '#f14bd3',
      npcMarker: true,
      npcMarkerKind: 'cap',
      spriteGridSize: 2,
    });
    expect(residentCap[0].width).toBeGreaterThanOrEqual(8);
    expect(residentCap[0].width).toBeLessThanOrEqual(18);
    expect(residentCap[0].x % 2).toBe(0);
    expect(residentCap[0].y % 2).toBe(0);
    expect(mara.some(shape => shape.npcMarkerKind === 'cap')).toBe(false);
  });
});

test('gives residents an NPC-only diamond distinct from Mara’s pointer', () => {
  const scene = createBrokenGateScene();
  const watchkeeper = scene.interactables.find(
    item => item.id === 'latchfolk-watchkeeper'
  );
  const frame = renderThreefoldFrame(
    createThreefoldSimulation(THRESHOLDS, scene)
  );
  const emblem = frame.shapes.filter(
    shape =>
      shape.geometryId === watchkeeper.id && shape.npcMarkerKind === 'emblem'
  );
  const mara = frame.shapes.filter(shape => shape.actorId === 'mara');

  expect(emblem).toHaveLength(8);
  expect(emblem.slice(0, 7).map(({ width }) => width)).toEqual([
    2, 6, 10, 14, 10, 6, 2,
  ]);
  expect(
    emblem.every(
      shape =>
        shape.height === 2 &&
        shape.spriteGridSize === 2 &&
        shape.x % 2 === 0 &&
        shape.y % 2 === 0 &&
        shape.width % 2 === 0
    )
  ).toBe(true);
  expect(emblem.slice(0, 7).every(shape => shape.fill === '#f14bd3')).toBe(
    true
  );
  expect(emblem[7]).toMatchObject({
    width: 2,
    height: 2,
    fill: '#f3f6d2',
    npcMarker: true,
    npcMarkerKind: 'emblem',
  });
  expect(mara.some(shape => shape.npcMarkerKind === 'emblem')).toBe(false);
  expect(mara.some(shape => shape.playerMarkerKind === 'pointer')).toBe(true);
});

describe('THREEFOLD legacy withdrawal rendering', () => {
  test.each([
    [
      { passengers: 'evacuated', ferry: 'lost', latchfolk: 'safe' },
      'MARA WITHDREW · PASSENGERS SAFE · LATCHFOLK SAFE',
    ],
    [
      { passengers: 'lost', ferry: 'lost', latchfolk: 'lost' },
      'MARA WITHDREW · PASSENGERS LOST · LATCHFOLK LOST',
    ],
    [
      { passengers: 'aboard', ferry: 'afloat', latchfolk: 'lost' },
      'MARA WITHDREW · PASSENGERS STILL ABOARD · LATCHFOLK LOST',
    ],
    [
      { passengers: 'partial', ferry: 'lost', latchfolk: 'lost' },
      'MARA WITHDREW · PASSENGERS 1/2 SAFE · 1/2 LOST · LATCHFOLK LOST',
    ],
  ])('renders a legacy withdrawal state %p', (outcomes, expectedToast) => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const legacyWithdrawal = {
      ...initial,
      crisis: {
        ...initial.crisis,
        elapsedMinutes: THRESHOLDS.aftermathAtMinutes,
        stage: 'aftermath',
      },
      episode: {
        ...initial.episode,
        ...outcomes,
        withdrawn: true,
      },
    };

    const frame = renderThreefoldFrame(legacyWithdrawal);

    expect(frame.threefold.closedBy).toBeNull();
    expect(frame.toast).toBe(expectedToast);
  });
});
