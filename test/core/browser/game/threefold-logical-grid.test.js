import { BASE_HEIGHT_METERS } from '../../../../src/core/browser/game/threefold/spatial.js';
import {
  exposeHierarchy,
  layoutScene,
  projectEntity,
  resolveHierarchyActionTarget,
  resolveSceneLayout,
} from '../../../../src/core/browser/game/threefold/logical-grid.js';

const cell = (...args) => {
  const [id, x, y, width = 1, height = 1, extra = {}] = args;
  return {
    id,
    ...extra,
    bounds: {
      min: { x: x * BASE_HEIGHT_METERS, y: y * BASE_HEIGHT_METERS },
      max: {
        x: (x + width) * BASE_HEIGHT_METERS,
        y: (y + height) * BASE_HEIGHT_METERS,
      },
    },
  };
};

describe('THREEFOLD logical grid projection', () => {
  test('uses the world origin and nearest grid lines with positive-direction ties', () => {
    const entity = {
      id: 'origin-tie',
      bounds: {
        min: { x: -0.5 * BASE_HEIGHT_METERS, y: -0.5 * BASE_HEIGHT_METERS },
        max: { x: 0.5 * BASE_HEIGHT_METERS, y: 0.5 * BASE_HEIGHT_METERS },
      },
    };
    expect(projectEntity(entity, 0)).toEqual({
      id: 'origin-tie',
      cellBounds: { x: 0, y: 0, width: 1, height: 1 },
    });
  });

  test('projects negative coordinates and fractional footprints deterministically', () => {
    const entity = {
      id: 'negative-room',
      bounds: {
        min: { x: -2.5 * BASE_HEIGHT_METERS, y: -3.1 * BASE_HEIGHT_METERS },
        max: { x: -0.5 * BASE_HEIGHT_METERS, y: -0.9 * BASE_HEIGHT_METERS },
      },
    };
    const before = JSON.stringify(entity);
    const projected = projectEntity(entity, 0);

    expect(projected).toEqual({
      id: 'negative-room',
      cellBounds: { x: -2, y: -3, width: 2, height: 2 },
    });
    expect(projectEntity(entity, 0)).toEqual(projected);
    expect(JSON.stringify(entity)).toBe(before);
  });

  test('refines one base-scale footprint into a three-by-three finer grid', () => {
    const entity = {
      id: 'base-cell',
      bounds: {
        min: { x: 0, y: 0 },
        max: { x: BASE_HEIGHT_METERS, y: BASE_HEIGHT_METERS },
      },
    };
    expect(projectEntity(entity, -1).cellBounds).toEqual({
      x: 0,
      y: 0,
      width: 3,
      height: 3,
    });
  });

  test.each([-4, -3, -2, -1, 0, 1, 2, 3, 4])(
    'projects varied positive footprints to integer cells at scale %i',
    scale => {
      const scaleRatio = 3 ** scale;
      const snap = value => Math.floor(value + 0.5);
      const fixtures = [
        { id: 'small-rectangle', x: -2, y: 1, width: 2, height: 3 },
        { id: 'wide-rectangle', x: -5, y: -3, width: 7, height: 2 },
        { id: 'tall-rectangle', x: 3, y: -4, width: 1, height: 6 },
      ];

      for (const fixture of fixtures) {
        const entity = cell(
          fixture.id,
          fixture.x,
          fixture.y,
          fixture.width,
          fixture.height
        );
        const original = JSON.stringify(entity);
        const left = snap(fixture.x / scaleRatio);
        const top = snap(fixture.y / scaleRatio);
        const right = snap((fixture.x + fixture.width) / scaleRatio);
        const bottom = snap((fixture.y + fixture.height) / scaleRatio);
        const projected = projectEntity(entity, scale);

        expect(projected).toEqual({
          id: fixture.id,
          cellBounds: {
            x: left,
            y: top,
            width: Math.max(1, right - left),
            height: Math.max(1, bottom - top),
          },
        });
        expect(
          Object.values(projected.cellBounds).every(Number.isInteger)
        ).toBe(true);
        expect(projectEntity(entity, scale)).toEqual(projected);
        expect(JSON.stringify(entity)).toBe(original);
      }
    }
  );

  test('reduces a two-by-two fine footprint to one coarse cell', () => {
    const fineCell = BASE_HEIGHT_METERS / 3;
    const entity = {
      id: 'two-by-two',
      bounds: {
        min: { x: 0, y: 0 },
        max: { x: fineCell * 2, y: fineCell * 2 },
      },
    };
    expect(projectEntity(entity, 0).cellBounds).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  test('keeps sub-cell positive objects visible with a minimum one-cell footprint', () => {
    const entity = {
      id: 'small-mark',
      bounds: { min: { x: 0.1, y: 0.1 }, max: { x: 0.2, y: 0.2 } },
    };
    expect(projectEntity(entity, 0).cellBounds).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  test('rejects missing entities, identity, bounds, non-finite edges and empty area', () => {
    expect(() => projectEntity(null, 0)).toThrow(TypeError);
    expect(() => projectEntity({ id: '', bounds: {} }, 0)).toThrow(TypeError);
    expect(() => projectEntity({ id: 'wall' }, 0)).toThrow(TypeError);
    expect(() =>
      projectEntity(
        {
          id: 'infinite-wall',
          bounds: { min: { x: Infinity, y: 0 }, max: { x: 1, y: 1 } },
        },
        0
      )
    ).toThrow(RangeError);
    expect(() =>
      projectEntity(
        {
          id: 'flat-wall',
          bounds: { min: { x: 0, y: 0 }, max: { x: 0, y: 1 } },
        },
        0
      )
    ).toThrow(RangeError);
  });
});

describe('THREEFOLD logical grid scene layout', () => {
  test('sorts disjoint placements and leaves canonical entities unchanged', () => {
    const entities = [cell('west', -2, 0), cell('east', 2, 0)];
    const before = JSON.stringify(entities);

    expect(
      layoutScene(entities, 0, { x: -3, y: -1, width: 7, height: 3 })
    ).toEqual({
      scale: 0,
      entities: [
        {
          id: 'east',
          cellBounds: { x: 2, y: 0, width: 1, height: 1 },
          placement: 'placed',
        },
        {
          id: 'west',
          cellBounds: { x: -2, y: 0, width: 1, height: 1 },
          placement: 'placed',
        },
      ],
      containments: [],
      intentionalOverlaps: [],
      conflicts: [],
      relationshipIssues: [],
      overflow: [],
    });
    expect(JSON.stringify(entities)).toBe(before);
  });

  test('reports same-cell and partial overlaps in stable identity order', () => {
    const entities = [cell('zeta', 1, 0, 2, 2), cell('alpha', 2, 1, 2, 2)];
    const forward = layoutScene(entities, 0);
    const reverse = layoutScene([...entities].reverse(), 0);

    expect(forward).toEqual(reverse);
    expect(forward.conflicts).toEqual([
      {
        type: 'unresolved-overlap',
        entityIds: ['alpha', 'zeta'],
        cellBounds: { x: 2, y: 1, width: 1, height: 1 },
      },
    ]);
    expect(forward.entities.map(entity => entity.placement)).toEqual([
      'unresolved',
      'unresolved',
    ]);
    expect(
      layoutScene([cell('b', 0, 0), cell('a', 0, 0)], 0).conflicts[0]
    ).toEqual({
      type: 'unresolved-overlap',
      entityIds: ['a', 'b'],
      cellBounds: { x: 0, y: 0, width: 1, height: 1 },
    });
  });

  test('recognizes authored containment while flagging a child outside its parent', () => {
    const valid = layoutScene(
      [
        cell('room', 0, 0, 3, 3),
        cell('table', 1, 1, 1, 1, { parentId: 'room' }),
      ],
      0
    );
    expect(valid.containments).toEqual([
      {
        parentId: 'room',
        childId: 'table',
        cellBounds: { x: 1, y: 1, width: 1, height: 1 },
      },
    ]);
    expect(valid.conflicts).toEqual([]);

    const invalid = layoutScene(
      [cell('room', 0, 0), cell('table', 2, 0, 1, 1, { parentId: 'room' })],
      0
    );
    expect(invalid.relationshipIssues).toEqual([
      { type: 'child-not-contained', parentId: 'room', childId: 'table' },
    ]);
    expect(invalid.entities.map(entity => entity.placement)).toEqual([
      'unresolved',
      'unresolved',
    ]);
  });

  test('allows only shared explicit overlap groups and returns shared cells', () => {
    const result = layoutScene(
      [
        cell('upper', 0, 0, 2, 1, { overlapGroupId: 'bridge' }),
        cell('lower', 1, 0, 2, 1, { overlapGroupId: 'bridge' }),
        cell('other', 1, 0),
      ],
      0
    );
    expect(result.intentionalOverlaps).toEqual([
      {
        groupId: 'bridge',
        entityIds: ['lower', 'upper'],
        cellBounds: { x: 1, y: 0, width: 1, height: 1 },
      },
    ]);
    expect(result.conflicts.map(conflict => conflict.entityIds)).toEqual([
      ['lower', 'other'],
      ['other', 'upper'],
    ]);
  });

  test('reports all viewport overflow and gives it placement precedence', () => {
    const result = layoutScene(
      [
        cell('inside', 0, 0),
        cell('outside', -1, 0),
        cell('crossing', 1, 0, 2, 1),
      ],
      0,
      { x: 0, y: 0, width: 2, height: 1 }
    );
    expect(result.overflow.map(item => item.entityId)).toEqual([
      'crossing',
      'outside',
    ]);
    expect(result.entities.map(entity => entity.placement)).toEqual([
      'overflow',
      'placed',
      'overflow',
    ]);
  });

  test('rejects invalid scenes, duplicate identities, relationships, groups and viewport bounds', () => {
    expect(() => layoutScene(null, 0)).toThrow(TypeError);
    expect(() =>
      layoutScene([cell('same', 0, 0), cell('same', 2, 0)], 0)
    ).toThrow(RangeError);
    expect(() =>
      layoutScene([cell('orphan', 0, 0, 1, 1, { parentId: 'missing' })], 0)
    ).toThrow(RangeError);
    expect(() =>
      layoutScene([cell('self', 0, 0, 1, 1, { parentId: 'self' })], 0)
    ).toThrow(RangeError);
    expect(() =>
      layoutScene([cell('bad-parent', 0, 0, 1, 1, { parentId: '' })], 0)
    ).toThrow(TypeError);
    expect(() =>
      layoutScene([cell('bad-group', 0, 0, 1, 1, { overlapGroupId: '' })], 0)
    ).toThrow(TypeError);
    expect(() =>
      layoutScene([], 0, { x: 0, y: 0, width: 0, height: 1 })
    ).toThrow(RangeError);
    expect(() =>
      layoutScene([], 0, { x: 0.5, y: 0, width: 1, height: 1 })
    ).toThrow(RangeError);
    expect(() => layoutScene([], 0, null)).toThrow(TypeError);
  });
});

describe('THREEFOLD semantic hierarchy exposure', () => {
  const authoredHierarchy = () => [
    { id: 'building', expandAtScale: -1 },
    { id: 'wall', parentId: 'building', expandAtScale: -3 },
    { id: 'crack', parentId: 'wall' },
    { id: 'door', parentId: 'building' },
  ];

  test('keeps a coarse composite visible and maps every hidden descendant to it', () => {
    const entities = authoredHierarchy();

    expect(exposeHierarchy(entities, 0)).toEqual({
      scale: 0,
      visibleEntityIds: ['building'],
      hiddenEntities: [
        { id: 'crack', proxyId: 'building', reason: 'proxied' },
        { id: 'door', proxyId: 'building', reason: 'proxied' },
        { id: 'wall', proxyId: 'building', reason: 'proxied' },
      ],
      proxies: [{ id: 'building', childIds: ['crack', 'door', 'wall'] }],
    });
  });

  test('expands at the authored threshold and resolves nested composites independently', () => {
    expect(exposeHierarchy(authoredHierarchy(), -1)).toEqual({
      scale: -1,
      visibleEntityIds: ['door', 'wall'],
      hiddenEntities: [
        { id: 'building', proxyId: null, reason: 'expanded' },
        { id: 'crack', proxyId: 'wall', reason: 'proxied' },
      ],
      proxies: [{ id: 'wall', childIds: ['crack'] }],
    });
    expect(exposeHierarchy(authoredHierarchy(), -3)).toEqual({
      scale: -3,
      visibleEntityIds: ['crack', 'door'],
      hiddenEntities: [
        { id: 'building', proxyId: null, reason: 'expanded' },
        { id: 'wall', proxyId: null, reason: 'expanded' },
      ],
      proxies: [],
    });
  });

  test('sorts several visible proxies by stable identity', () => {
    const entities = [
      { id: 'z-house', expandAtScale: -1 },
      { id: 'z-wall', parentId: 'z-house' },
      { id: 'a-house', expandAtScale: -1 },
      { id: 'a-wall', parentId: 'a-house' },
    ];

    expect(exposeHierarchy(entities, 0).proxies).toEqual([
      { id: 'a-house', childIds: ['a-wall'] },
      { id: 'z-house', childIds: ['z-wall'] },
    ]);
  });

  test('returns deterministic exposure under input permutation without mutating authored data', () => {
    const entities = authoredHierarchy();
    const before = JSON.stringify(entities);

    expect(exposeHierarchy([...entities].reverse(), -1)).toEqual(
      exposeHierarchy(entities, -1)
    );
    expect(JSON.stringify(entities)).toBe(before);
  });

  test('rejects invalid identities, parent graphs, and expansion thresholds', () => {
    expect(() => exposeHierarchy(null, 0)).toThrow(TypeError);
    expect(() => exposeHierarchy([null], 0)).toThrow(TypeError);
    expect(() => exposeHierarchy([[]], 0)).toThrow(TypeError);
    expect(() => exposeHierarchy([{ id: '' }], 0)).toThrow(TypeError);
    expect(() => exposeHierarchy([{ id: 'same' }, { id: 'same' }], 0)).toThrow(
      RangeError
    );
    expect(() => exposeHierarchy([{ id: 'child', parentId: '' }], 0)).toThrow(
      TypeError
    );
    expect(() =>
      exposeHierarchy([{ id: 'child', parentId: 'missing' }], 0)
    ).toThrow(RangeError);
    expect(() =>
      exposeHierarchy([{ id: 'parent', expandAtScale: -1.5 }], 0)
    ).toThrow(RangeError);
    expect(() =>
      exposeHierarchy([{ id: 'parent', expandAtScale: -5 }], 0)
    ).toThrow(RangeError);
    expect(() =>
      exposeHierarchy(
        [{ id: 'parent' }, { id: 'child', parentId: 'parent' }],
        0
      )
    ).toThrow('Hierarchy composite requires an expansion threshold: parent');
    expect(() =>
      exposeHierarchy([{ id: 'leaf', expandAtScale: -1 }], 0)
    ).toThrow('Hierarchy leaf cannot have an expansion threshold: leaf');
    expect(() =>
      exposeHierarchy(
        [
          { id: 'first', parentId: 'second', expandAtScale: -1 },
          { id: 'second', parentId: 'first', expandAtScale: -1 },
        ],
        0
      )
    ).toThrow('Hierarchy contains a cycle');
  });
});

describe('THREEFOLD scale-specific hierarchy action targets', () => {
  const nestedHierarchy = () => [
    { id: 'building', expandAtScale: -1 },
    { id: 'wall', parentId: 'building', expandAtScale: -3 },
    { id: 'crack', parentId: 'wall' },
  ];

  test('maps coarse targets to descendants and narrows targets as scale expands', () => {
    const entities = nestedHierarchy();
    const original = JSON.stringify(entities);
    expect(resolveHierarchyActionTarget(entities, 0, 'building')).toEqual({
      targetId: 'building',
      affectedEntityIds: ['building', 'crack', 'wall'],
    });
    expect(resolveHierarchyActionTarget(entities, 0, 'wall')).toBeNull();
    expect(resolveHierarchyActionTarget(entities, -1, 'wall')).toEqual({
      targetId: 'wall',
      affectedEntityIds: ['crack', 'wall'],
    });
    expect(resolveHierarchyActionTarget(entities, -1, 'building')).toBeNull();
    expect(resolveHierarchyActionTarget(entities, -3, 'crack')).toEqual({
      targetId: 'crack',
      affectedEntityIds: ['crack'],
    });
    expect(resolveHierarchyActionTarget(entities, -3, 'wall')).toBeNull();
    expect(
      resolveHierarchyActionTarget([...entities].reverse(), 0, 'building')
    ).toEqual(resolveHierarchyActionTarget(entities, 0, 'building'));
    expect(JSON.stringify(entities)).toBe(original);
  });

  test('expands a visible crate-pile target and restores distinct fine targets', () => {
    const cratePile = [
      { id: 'crate-pile', expandAtScale: -1 },
      ...Array.from({ length: 9 }, (_, index) => ({
        id: `crate-${index + 1}`,
        parentId: 'crate-pile',
      })),
    ];
    expect(resolveHierarchyActionTarget(cratePile, 0, 'crate-pile')).toEqual({
      targetId: 'crate-pile',
      affectedEntityIds: [
        'crate-1',
        'crate-2',
        'crate-3',
        'crate-4',
        'crate-5',
        'crate-6',
        'crate-7',
        'crate-8',
        'crate-9',
        'crate-pile',
      ],
    });
    expect(
      resolveHierarchyActionTarget(cratePile, -1, 'crate-pile')
    ).toBeNull();
    expect(resolveHierarchyActionTarget(cratePile, -1, 'crate-4')).toEqual({
      targetId: 'crate-4',
      affectedEntityIds: ['crate-4'],
    });
    expect(resolveHierarchyActionTarget(cratePile, 0, 'unrelated')).toBeNull();
    expect(resolveHierarchyActionTarget(cratePile, 0, '')).toBeNull();
    expect(resolveHierarchyActionTarget(cratePile, 0, null)).toBeNull();
  });
});

describe('THREEFOLD resolved scene layout', () => {
  const authoredScene = () => [
    cell('building', 0, 0, 3, 3, { hierarchy: { expandAtScale: -1 } }),
    cell('wall', 1, 1, 2, 1, {
      hierarchy: { parentId: 'building', expandAtScale: -3 },
    }),
    cell('crack', 2, 1, 1, 1, { hierarchy: { parentId: 'wall' } }),
  ];

  test('composes nested visibility with geometry at coarse, exact and fine scales', () => {
    const entities = authoredScene();
    const coarse = resolveSceneLayout(entities, 0);
    const atBuildingThreshold = resolveSceneLayout(entities, -1);
    const atWallThreshold = resolveSceneLayout(entities, -3);

    expect(coarse.hierarchy.visibleEntityIds).toEqual(['building']);
    expect(coarse.entities.map(entity => entity.id)).toEqual(['building']);
    expect(coarse.entities[0].cellBounds).toEqual({
      x: 0,
      y: 0,
      width: 3,
      height: 3,
    });
    expect(coarse.hierarchy.proxies).toEqual([
      { id: 'building', childIds: ['crack', 'wall'] },
    ]);

    expect(atBuildingThreshold.hierarchy.visibleEntityIds).toEqual(['wall']);
    expect(atBuildingThreshold.entities.map(entity => entity.id)).toEqual([
      'wall',
    ]);
    expect(atBuildingThreshold.hierarchy.proxies).toEqual([
      { id: 'wall', childIds: ['crack'] },
    ]);

    expect(atWallThreshold.hierarchy.visibleEntityIds).toEqual(['crack']);
    expect(atWallThreshold.entities.map(entity => entity.id)).toEqual([
      'crack',
    ]);
    expect(atWallThreshold.hierarchy.hiddenEntities).toEqual([
      { id: 'building', proxyId: null, reason: 'expanded' },
      { id: 'wall', proxyId: null, reason: 'expanded' },
    ]);
  });

  test('collapses a three-by-three crate pile into one stable coarse target', () => {
    const cratePile = [
      cell('crate-pile', 0, 0, 1, 1, {
        hierarchy: { expandAtScale: -1 },
      }),
      ...Array.from({ length: 9 }, (_, index) =>
        cell(
          `crate-${index + 1}`,
          (index % 3) / 3,
          Math.floor(index / 3) / 3,
          1 / 3,
          1 / 3,
          { hierarchy: { parentId: 'crate-pile' } }
        )
      ),
    ];
    const before = JSON.stringify(cratePile);
    const coarse = resolveSceneLayout(cratePile, 0);
    const fine = resolveSceneLayout(cratePile, -1);

    expect(coarse.entities.map(entity => entity.id)).toEqual(['crate-pile']);
    expect(coarse.entities[0].cellBounds).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
    expect(coarse.hierarchy.hiddenEntities).toHaveLength(9);
    expect(
      coarse.hierarchy.hiddenEntities.every(
        entity => entity.proxyId === 'crate-pile'
      )
    ).toBe(true);

    expect(fine.entities.map(entity => entity.id)).toEqual(
      Array.from({ length: 9 }, (_, index) => `crate-${index + 1}`)
    );
    expect(fine.entities.map(({ cellBounds }) => cellBounds)).toEqual(
      Array.from({ length: 9 }, (_, index) => ({
        x: index % 3,
        y: Math.floor(index / 3),
        width: 1,
        height: 1,
      }))
    );
    expect(fine.conflicts).toEqual([]);
    expect(resolveSceneLayout([...cratePile].reverse(), -1)).toEqual(fine);
    expect(JSON.stringify(cratePile)).toBe(before);
  });

  test('reports every conflict in a crowded two-by-two grid after coarsening', () => {
    const crowdedObjects = Array.from({ length: 4 }, (_, index) =>
      cell(
        `crowded-${index + 1}`,
        (index % 2) / 3,
        Math.floor(index / 2) / 3,
        1 / 3,
        1 / 3
      )
    );
    const before = JSON.stringify(crowdedObjects);
    const fine = layoutScene(crowdedObjects, -1);
    const coarse = layoutScene(crowdedObjects, 0);

    expect(fine.entities.map(({ cellBounds }) => cellBounds)).toEqual(
      Array.from({ length: 4 }, (_, index) => ({
        x: index % 2,
        y: Math.floor(index / 2),
        width: 1,
        height: 1,
      }))
    );
    expect(fine.conflicts).toEqual([]);
    expect(fine.entities.map(({ placement }) => placement)).toEqual([
      'placed',
      'placed',
      'placed',
      'placed',
    ]);

    expect(coarse.entities.map(({ cellBounds }) => cellBounds)).toEqual(
      Array.from({ length: 4 }, () => ({
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      }))
    );
    expect(coarse.conflicts.map(({ entityIds }) => entityIds)).toEqual([
      ['crowded-1', 'crowded-2'],
      ['crowded-1', 'crowded-3'],
      ['crowded-1', 'crowded-4'],
      ['crowded-2', 'crowded-3'],
      ['crowded-2', 'crowded-4'],
      ['crowded-3', 'crowded-4'],
    ]);
    expect(coarse.entities.map(({ placement }) => placement)).toEqual([
      'unresolved',
      'unresolved',
      'unresolved',
      'unresolved',
    ]);
    expect(layoutScene([...crowdedObjects].reverse(), 0)).toEqual(coarse);
    expect(JSON.stringify(crowdedObjects)).toBe(before);
  });

  test('preserves packing conflicts and finite viewport overflow', () => {
    const result = resolveSceneLayout(
      [
        cell('building', 0, 0, 1, 1, { hierarchy: { expandAtScale: -1 } }),
        cell('wall', 0, 0, 1, 1, {
          hierarchy: { parentId: 'building' },
        }),
        cell('other', 0, 0),
        cell('outside', 2, 0),
      ],
      0,
      { x: 0, y: 0, width: 1, height: 1 }
    );

    expect(result.conflicts).toEqual([
      {
        type: 'unresolved-overlap',
        entityIds: ['building', 'other'],
        cellBounds: { x: 0, y: 0, width: 1, height: 1 },
      },
    ]);
    expect(result.overflow.map(item => item.entityId)).toEqual(['outside']);
    expect(result.entities.map(entity => entity.placement)).toEqual([
      'unresolved',
      'unresolved',
      'overflow',
    ]);
    expect(result.hierarchy.hiddenEntities).toEqual([
      { id: 'wall', proxyId: 'building', reason: 'proxied' },
    ]);
  });

  test('is stable under permutation and leaves canonical entities unchanged', () => {
    const entities = authoredScene();
    const before = JSON.stringify(entities);

    expect(resolveSceneLayout([...entities].reverse(), -1)).toEqual(
      resolveSceneLayout(entities, -1)
    );
    expect(JSON.stringify(entities)).toBe(before);
  });

  test('rejects malformed semantic hierarchy fields and missing hierarchy parents', () => {
    expect(() => resolveSceneLayout(null, 0)).toThrow(TypeError);
    expect(() => resolveSceneLayout([null], 0)).toThrow(TypeError);
    expect(() =>
      resolveSceneLayout([cell('bad', 0, 0, 1, 1, { hierarchy: [] })], 0)
    ).toThrow(TypeError);
    expect(() =>
      resolveSceneLayout(
        [cell('orphan', 0, 0, 1, 1, { hierarchy: { parentId: 'missing' } })],
        0
      )
    ).toThrow(RangeError);
  });
});
