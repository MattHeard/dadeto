import { createThreefoldScaleSaveStore } from '../../../../src/core/browser/game/threefold/save.js';
import { createBrokenGateScene } from '../../../../src/core/browser/game/threefold/gatehouse.js';
import {
  changeScale,
  growThroughGeometry,
  moveAtScale,
  projectGeometryForScale,
} from '../../../../src/core/browser/game/threefold/spatial.js';

describe('THREEFOLD Broken Gate scene', () => {
  test('creates stable authored areas and geometry in canonical metres', () => {
    const scene = createBrokenGateScene();
    const repeated = createBrokenGateScene();

    expect(scene).toEqual(repeated);
    expect(scene).not.toBe(repeated);
    expect(scene.geometry).not.toBe(repeated.geometry);
    const station = scene.geometry.find(({ id }) => id === 'signal-station');
    const repeatedStation = repeated.geometry.find(
      ({ id }) => id === 'signal-station'
    );
    const console = scene.interactables.find(
      ({ id }) => id === 'signal-station-console'
    );
    const repeatedConsole = repeated.interactables.find(
      ({ id }) => id === 'signal-station-console'
    );
    expect(station.hierarchy).toEqual({ expandAtScale: -2 });
    expect(console.hierarchy).toEqual({ parentId: 'signal-station' });
    expect(station.hierarchy).not.toBe(repeatedStation.hierarchy);
    expect(console.hierarchy).not.toBe(repeatedConsole.hierarchy);
    expect(scene.id).toBe('broken-gate');
    expect(scene.bounds).toEqual({
      min: { x: 0, y: 0 },
      max: { x: 12, y: 9 },
    });
    expect(scene.spawn).toMatchObject({
      position: { x: 3, y: 4 },
      scale: 0,
      anchor: 8,
      minimumUnlockedScale: -2,
      maximumUnlockedScale: 1,
    });
    expect(scene.areas.map(({ id }) => id)).toEqual([
      'gatehouse',
      'ferry-landing',
      'drainage-settlement',
      'maintenance-passage',
    ]);
    expect(scene.geometry.map(({ id }) => id)).toEqual([
      'gatehouse-west-wall',
      'relief-gate',
      'gate-counterweight',
      'landing-piling',
      'drainage-weir',
      'signal-station',
    ]);
    expect(scene.interactables.map(({ id }) => id)).toEqual([
      'ferry-mooring-line',
      'latchfolk-watchkeeper',
      'upland-road-exit',
      'relief-gate-locking-pawl',
      'signal-station-console',
    ]);
    expect(scene.interactables[1].position).toEqual({ x: 7.25, y: 7.25 });
    expect(scene.interactables[2].position).toEqual({ x: 0.5, y: 2 });
    expect(scene.creatures).toMatchObject([
      {
        id: 'gatehouse-rat',
        position: { x: 3.28, y: 4 },
        bounds: {
          min: { x: 3.18, y: 3.9, z: 0 },
          max: { x: 3.38, y: 4.1, z: 0.2032 },
        },
      },
    ]);

    scene.geometry[0].bounds.min.x = -100;
    scene.areas[0].bounds.min.x = -100;
    scene.creatures[0].bounds.min.x = -100;
    expect(createBrokenGateScene().geometry[0].bounds.min.x).toBe(3.45);
    expect(createBrokenGateScene().areas[0].bounds.min.x).toBe(2);
    expect(createBrokenGateScene().creatures[0].bounds.min.x).toBe(3.18);
  });

  test('grows through the authored wall and preserves its rubble in saves and views', () => {
    const scene = createBrokenGateScene();
    const grown = growThroughGeometry(
      scene.spawn,
      scene.geometry,
      scene.baseBodyWidthMeters
    );

    expect(grown).toMatchObject({ scale: 1, anchor: 7 });
    expect(grown.position).toEqual(scene.spawn.position);
    expect(grown.destroyedGeometryIds).toEqual(['gatehouse-west-wall']);

    const projected = projectGeometryForScale(grown, scene.geometry);
    expect(projected.view.scale).toBe(1);
    expect(projected.geometry.map(({ id }) => id)).toEqual([
      'drainage-weir',
      'gate-counterweight',
      'landing-piling',
      'relief-gate',
      'signal-station',
    ]);

    const finer = changeScale(grown, -1);
    expect(projectGeometryForScale(finer, scene.geometry).geometry).toEqual(
      projected.geometry
    );

    const entries = new Map();
    const store = createThreefoldScaleSaveStore({
      getItem: key => entries.get(key) ?? null,
      setItem: (key, value) => entries.set(key, value),
    });
    expect(store.save(grown)).toBe(true);
    expect(store.load()).toEqual(grown);
  });

  test('movement scales in metres and rubble opens the blocked route', () => {
    const scene = createBrokenGateScene();
    const firstStep = moveAtScale(scene.spawn, 'right', scene.geometry, scene);
    const blocked = moveAtScale(firstStep, 'right', scene.geometry, scene);
    expect(firstStep.position.x).toBeGreaterThan(scene.spawn.position.x);
    expect(blocked).toBe(firstStep);

    const grown = growThroughGeometry(
      firstStep,
      scene.geometry,
      scene.baseBodyWidthMeters
    );
    const throughRubble = moveAtScale(grown, 'right', scene.geometry, scene);
    expect(grown.destroyedGeometryIds).toEqual(['gatehouse-west-wall']);
    expect(throughRubble.position.x - grown.position.x).toBeCloseTo(
      3 * (firstStep.position.x - scene.spawn.position.x),
      12
    );
    expect(throughRubble.scale).toBe(grown.scale);
    expect(throughRubble.anchor).toBe(grown.anchor);
  });

  test('keeps movement inside finite bounds and ignores unsupported directions', () => {
    const scene = createBrokenGateScene();
    const nearEdge = {
      ...scene.spawn,
      position: { x: 0.2, y: 4 },
    };
    expect(moveAtScale(nearEdge, 'left', [], scene)).toBe(nearEdge);
    expect(moveAtScale(scene.spawn, 'teleport', [], scene)).toBe(scene.spawn);
    expect(() =>
      moveAtScale(scene.spawn, 'up', [], {
        ...scene,
        bounds: { min: { x: 0, y: 0 }, max: { x: 0, y: 9 } },
      })
    ).toThrow(RangeError);
    expect(() =>
      moveAtScale(scene.spawn, 'up', [], {
        ...scene,
        bounds: { max: { x: 12, y: 9 } },
      })
    ).toThrow(TypeError);
  });
});
