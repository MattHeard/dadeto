import { BASE_HEIGHT_METERS } from '../../../../src/core/browser/game/threefold/spatial.js';
import { projectEntity } from '../../../../src/core/browser/game/threefold/logical-grid.js';

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
