import { createThreefoldScaleSaveStore } from '../../../../src/core/browser/game/threefold/save.js';
import { createBrokenGateScene } from '../../../../src/core/browser/game/threefold/gatehouse.js';
import {
  changeScale,
  growThroughGeometry,
  projectGeometryForScale,
} from '../../../../src/core/browser/game/threefold/spatial.js';

describe('THREEFOLD Broken Gate scene', () => {
  test('creates stable authored areas and geometry in canonical metres', () => {
    const scene = createBrokenGateScene();
    const repeated = createBrokenGateScene();

    expect(scene).toEqual(repeated);
    expect(scene).not.toBe(repeated);
    expect(scene.geometry).not.toBe(repeated.geometry);
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
    ]);

    scene.geometry[0].bounds.min.x = -100;
    scene.areas[0].bounds.min.x = -100;
    expect(createBrokenGateScene().geometry[0].bounds.min.x).toBe(3.45);
    expect(createBrokenGateScene().areas[0].bounds.min.x).toBe(2);
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
});
