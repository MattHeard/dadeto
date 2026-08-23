import { describe, expect, it, jest } from '@jest/globals';
import {
  conwayLife,
  conwayLifeTestOnly,
  getStoredLifeCandidate,
  normalizeState,
} from '../../../src/core/browser/toys/2026-06-22/conwayLife.js';

const getCanvasPayload = (input, storageValue, env = null) => {
  const setLocalPermanentData = jest.fn(next => {
    storageValue.current = {
      ...(storageValue.current || {}),
      ...next,
    };
    return storageValue.current;
  });
  const runtimeEnv =
    env || new Map([['setLocalPermanentData', setLocalPermanentData]]);
  const payload = JSON.parse(conwayLife(input, runtimeEnv));
  return { payload, setLocalPermanentData, storageValue };
};

describe('conwayLife', () => {
  it('renders a canvas payload and persists the initial state', () => {
    const storageValue = { current: null };
    const { payload, setLocalPermanentData } = getCanvasPayload(
      JSON.stringify({
        width: 240,
        height: 160,
        cols: 12,
        rows: 8,
        tickSpeedMs: 64,
        cells: [
          [1, 1],
          [2, 1],
          [3, 1],
        ],
      }),
      storageValue
    );

    expect(payload.width).toBe(240);
    expect(payload.height).toBe(160);
    expect(payload.shapes[0].fill).toBe('#0f172a');
    expect(payload.shapes).toHaveLength(4);
    expect(setLocalPermanentData).toHaveBeenCalledTimes(2);
  });

  it('advances the stored board on the next submit', () => {
    const storageValue = {
      current: {
        CONW1: {
          width: 120,
          height: 80,
          cols: 6,
          rows: 6,
          tickSpeedMs: 16,
          framesPerTick: 1,
          generation: 0,
          cells: [
            [1, 2],
            [2, 2],
            [3, 2],
          ],
        },
      },
    };
    const { payload } = getCanvasPayload('{}', storageValue);

    expect(payload.shapes).toHaveLength(4);
    expect(storageValue.current.CONW1.generation).toBe(1);
    expect(storageValue.current.CONW1.cells).toEqual([
      [2, 1],
      [2, 2],
      [2, 3],
    ]);
  });

  it('falls back to the default seed when input is invalid', () => {
    const storageValue = { current: null };
    const { payload } = getCanvasPayload('not json', storageValue);

    expect(payload.width).toBe(360);
    expect(payload.height).toBe(240);
    expect(payload.shapes.length).toBeGreaterThan(1);
  });

  it('resets to the input seed when reset is true', () => {
    const storageValue = {
      current: {
        CONW1: {
          width: 120,
          height: 80,
          cols: 6,
          rows: 6,
          tickSpeedMs: 16,
          framesPerTick: 1,
          framesUntilTick: 1,
          generation: 7,
          cells: [[0, 0]],
        },
      },
    };

    getCanvasPayload(
      JSON.stringify({
        reset: true,
        cells: [
          [1, 1],
          [2, 1],
          [3, 1],
        ],
      }),
      storageValue
    );

    expect(storageValue.current.CONW1.generation).toBe(0);
    expect(storageValue.current.CONW1.cells).toEqual([
      [1, 1],
      [2, 1],
      [3, 1],
    ]);
  });

  it('wraps edge neighbors across the board boundaries', () => {
    const storageValue = {
      current: {
        CONW1: {
          width: 120,
          height: 80,
          cols: 5,
          rows: 5,
          tickSpeedMs: 16,
          framesPerTick: 1,
          framesUntilTick: 1,
          generation: 0,
          cells: [
            [0, 0],
            [4, 0],
            [0, 4],
          ],
        },
      },
    };

    const { payload } = getCanvasPayload('{}', storageValue);

    expect(payload.shapes).toHaveLength(5);
    expect(storageValue.current.CONW1.cells).toContainEqual([4, 4]);
    expect(storageValue.current.CONW1.cells).toContainEqual([0, 0]);
  });
});

describe('conwayLife storage fallbacks', () => {
  it('treats blank input as an empty submission when storage is unavailable', () => {
    const payload = JSON.parse(conwayLife('   '));

    expect(payload.width).toBe(360);
    expect(payload.height).toBe(240);
    expect(payload.shapes).toHaveLength(6);
  });

  it('ignores malformed storage accessors and still renders the default seed', () => {
    const storageValue = { current: null };
    const env = new Map([['setLocalPermanentData', 'not a function']]);

    const { payload } = getCanvasPayload('{}', storageValue, env);

    expect(payload.width).toBe(360);
    expect(storageValue.current).toBeNull();
  });

  it('falls back to the seed when stored data parses to a primitive', () => {
    const storageValue = { current: null };
    const env = new Map([['setLocalPermanentData', () => 42]]);

    const { payload } = getCanvasPayload('{}', storageValue, env);

    expect(payload.width).toBe(360);
    expect(payload.shapes).toHaveLength(6);
  });

  it('returns null for wrapped malformed stored life payloads', () => {
    const storageValue = {
      current: {
        CONW1: 42,
      },
    };

    const { payload } = getCanvasPayload('{}', storageValue);

    expect(payload.width).toBe(360);
    expect(storageValue.current.CONW1.generation).toBe(0);
  });

  it('returns null when the wrapped stored life record is falsy or an array', () => {
    const falsyStorage = {
      current: {
        CONW1: false,
      },
    };
    const arrayStorage = {
      current: {
        CONW1: [],
      },
    };

    const falsy = getCanvasPayload('{}', falsyStorage);
    const array = getCanvasPayload('{}', arrayStorage);

    expect(falsy.payload.width).toBe(360);
    expect(array.payload.width).toBe(360);
  });

  it('returns null from the normalized candidate guard for falsy wrapped records', () => {
    expect(getStoredLifeCandidate({ CONW1: false })).toBeNull();
    expect(normalizeState({ CONW1: false })).toBeNull();
  });

  it('returns the wrapped stored record when it is truthy', () => {
    const stored = { width: 120 };

    expect(getStoredLifeCandidate({ CONW1: stored })).toBe(stored);
  });
});

describe('conwayLife state normalization', () => {
  it('ignores wrapped storage objects without the expected key shape', () => {
    const storageValue = {
      current: {
        notConway: {
          width: 120,
          height: 80,
          cols: 6,
          rows: 6,
          tickSpeedMs: 16,
          framesPerTick: 0,
          framesUntilTick: 0,
          generation: 2,
          cells: [[1, 1]],
        },
      },
    };

    const { payload } = getCanvasPayload('{}', storageValue);

    expect(payload.width).toBe(360);
    expect(payload.shapes).toHaveLength(6);
  });

  it('falls back when wrapped storage contains a missing or empty record', () => {
    const missingStorage = {
      current: {
        CONW1: null,
      },
    };
    const emptyStorage = {
      current: {
        CONW1: {},
      },
    };

    const missing = getCanvasPayload('{}', missingStorage);
    const empty = getCanvasPayload('{}', emptyStorage);

    expect(missing.payload.width).toBe(360);
    expect(empty.payload.width).toBe(360);
  });

  it('returns the default seed when the wrapped record is falsy', () => {
    const storageValue = {
      current: {
        CONW1: false,
      },
    };

    const { payload } = getCanvasPayload('{}', storageValue);

    expect(payload.width).toBe(360);
    expect(storageValue.current.CONW1.generation).toBe(0);
  });

  it('normalizes wrapped storage when frames are collapsed below one', () => {
    const storageValue = {
      current: {
        CONW1: {
          width: 120,
          height: 80,
          cols: 6,
          rows: 6,
          tickSpeedMs: 16,
          framesPerTick: 0,
          framesUntilTick: 0,
          generation: 2,
          cells: [[1, 1]],
        },
      },
    };

    getCanvasPayload('{}', storageValue);

    expect(storageValue.current.CONW1.framesPerTick).toBe(1);
    expect(storageValue.current.CONW1.framesUntilTick).toBe(1);
  });

  it('normalizes wrapped stored life payloads with collapsed counters', () => {
    const storageValue = {
      current: {
        CONW1: {
          width: 120,
          height: 80,
          cols: 6,
          rows: 6,
          tickSpeedMs: 16,
          framesPerTick: 0,
          framesUntilTick: 0,
          generation: 2,
          cells: [[1, 1]],
        },
      },
    };

    getCanvasPayload('{}', storageValue);

    expect(storageValue.current.CONW1.framesPerTick).toBe(1);
    expect(storageValue.current.CONW1.framesUntilTick).toBe(1);
  });

  it('normalizes stored candidates with invalid cells and reset timing fields', () => {
    const storageValue = {
      current: {
        CONW1: {
          width: 120,
          height: 80,
          cols: 5,
          rows: 5,
          tickSpeedMs: 15,
          framesPerTick: 0,
          framesUntilTick: 0,
          generation: 4,
          cells: [null, [1], [1, 1], [6, -1], ['bad', 2], [1, 1]],
        },
      },
    };

    getCanvasPayload('{}', storageValue);

    expect(storageValue.current.CONW1.tickSpeedMs).toBe(16);
    expect(storageValue.current.CONW1.framesPerTick).toBe(1);
    expect(storageValue.current.CONW1.framesUntilTick).toBe(1);
    expect(storageValue.current.CONW1.generation).toBe(5);
    expect(storageValue.current.CONW1.cells).toEqual([]);
  });

  it('clamps fractional timing fields that round below one', () => {
    const storageValue = {
      current: {
        CONW1: {
          width: 120,
          height: 80,
          cols: 6,
          rows: 6,
          tickSpeedMs: 16,
          framesPerTick: 0.4,
          framesUntilTick: 0.4,
          generation: 2,
          cells: [[1, 1]],
        },
      },
    };

    getCanvasPayload('{}', storageValue);

    expect(storageValue.current.CONW1.framesPerTick).toBe(1);
    expect(storageValue.current.CONW1.framesUntilTick).toBe(1);
  });

  it('creates a fresh seed from the input and resets generation to zero', () => {
    const storageValue = {
      current: {
        CONW1: {
          width: 120,
          height: 80,
          cols: 6,
          rows: 6,
          tickSpeedMs: 16,
          framesPerTick: 1,
          framesUntilTick: 1,
          generation: 9,
          cells: [[0, 0]],
        },
      },
    };

    getCanvasPayload(
      JSON.stringify({
        reset: true,
        width: 200,
        height: 120,
        cols: 8,
        rows: 4,
        tickSpeedMs: 32,
        cells: [
          [0, 0],
          [7, 3],
        ],
      }),
      storageValue
    );

    expect(storageValue.current.CONW1.width).toBe(120);
    expect(storageValue.current.CONW1.height).toBe(80);
    expect(storageValue.current.CONW1.framesPerTick).toBe(2);
    expect(storageValue.current.CONW1.framesUntilTick).toBe(2);
    expect(storageValue.current.CONW1.generation).toBe(0);
    expect(storageValue.current.CONW1.cells).toEqual([
      [0, 0],
      [7, 3],
    ]);
  });

  it('keeps the board steady when the stored countdown has not elapsed', () => {
    const storageValue = {
      current: {
        CONW1: {
          width: 120,
          height: 80,
          cols: 6,
          rows: 6,
          tickSpeedMs: 16,
          framesPerTick: 2,
          framesUntilTick: 2,
          generation: 4,
          cells: [
            [1, 2],
            [2, 2],
            [3, 2],
          ],
        },
      },
    };

    const { payload } = getCanvasPayload('{}', storageValue);

    expect(payload.shapes).toHaveLength(4);
    expect(storageValue.current.CONW1.framesUntilTick).toBe(1);
    expect(storageValue.current.CONW1.generation).toBe(4);
  });

  it('ignores invalid cell payloads while keeping valid wrapped cells', () => {
    const storageValue = { current: null };
    const { payload } = getCanvasPayload(
      JSON.stringify({
        cells: [[1, 1], [1, 1], [7, 7], ['x', 2], [2]],
      }),
      storageValue
    );

    expect(payload.shapes).toHaveLength(3);
    expect(storageValue.current.CONW1.cells).toEqual([
      [1, 1],
      [7, 7],
    ]);
  });

  it('covers pure board, wrapping, neighbor, and serialization helpers', () => {
    expect(conwayLifeTestOnly.wrapCoordinate(-1, 5)).toBe(4);
    expect(conwayLifeTestOnly.wrapCoordinate(5, 5)).toBe(0);
    expect(
      conwayLifeTestOnly.dedupeCells([
        { x: 1, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 3 },
      ])
    ).toEqual([
      { x: 1, y: 2 },
      { x: 2, y: 3 },
    ]);
    expect(conwayLifeTestOnly.getNeighbors({ x: 0, y: 0 }, 3, 3)).toHaveLength(
      8
    );
    expect(
      conwayLifeTestOnly.evolveCells(
        [
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 1, y: 2 },
        ],
        3,
        3
      )
    ).toEqual(
      expect.arrayContaining([
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ])
    );
    expect(conwayLifeTestOnly.serializeCell({ x: 2, y: 3 })).toEqual([2, 3]);
    expect(
      conwayLifeTestOnly.serializeState({
        generation: 2,
        cells: [{ x: 1, y: 1 }],
      })
    ).toMatchObject({ generation: 2 });
    expect(conwayLifeTestOnly.createBackdropShape(10, 20)).toMatchObject({
      width: 10,
      height: 20,
    });
    expect(conwayLifeTestOnly.normalizeTickSpeedMs('bad')).toBeGreaterThan(0);
    expect(conwayLifeTestOnly.normalizeCells(null, 4, 4)).toEqual([
      { x: 11, y: 7 },
      { x: 12, y: 7 },
      { x: 13, y: 7 },
      { x: 13, y: 6 },
      { x: 12, y: 5 },
    ]);
    expect(
      conwayLifeTestOnly.normalizeCells([[5, -1], ['bad', 2], [1]], 4, 4)
    ).toEqual([{ x: 1, y: 3 }]);
    expect(
      conwayLifeTestOnly.normalizeCells([{ length: 2, 0: 1, 1: 2 }], 4, 4)
    ).toEqual([]);
    expect(conwayLifeTestOnly.getNeighbors({ x: 0, y: 0 }, 3, 3)).toEqual(
      expect.arrayContaining([
        { x: 2, y: 2 },
        { x: 0, y: 2 },
        { x: 1, y: 1 },
      ])
    );
    expect(conwayLifeTestOnly.getNeighbors({ x: 0, y: 0 }, 3, 3)).toEqual([
      { x: 2, y: 2 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 1 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
    expect(
      conwayLifeTestOnly.toCanvasPayload({
        width: 10,
        height: 20,
        cols: 4,
        rows: 5,
        cells: [{ x: 2, y: 3 }],
      })
    ).toEqual({
      width: 10,
      height: 20,
      shapes: [
        { type: 'rect', x: 0, y: 0, width: 10, height: 20, fill: '#0f172a' },
        { type: 'rect', x: 6, y: 13, width: 1, height: 2, fill: '#dbeafe' },
      ],
    });
    expect(conwayLifeTestOnly.normalizeState([])).toBeNull();
    expect(
      conwayLifeTestOnly.normalizeState({
        width: 10,
        height: 20,
        cols: 2,
        rows: 2,
        cells: [],
      })
    ).toMatchObject({ width: 10, height: 20, cols: 2, rows: 2 });
    expect(conwayLifeTestOnly.normalizeState({ CONW1: [] })).toBeNull();
    expect(
      conwayLifeTestOnly.normalizeStoredLifeCandidate({
        width: 10,
        height: 10,
        cols: 2,
        rows: 2,
        tickSpeedMs: 16,
        framesPerTick: 0,
        framesUntilTick: 0,
        cells: [],
      })
    ).toMatchObject({ framesPerTick: 1, framesUntilTick: 1 });
    expect(
      conwayLifeTestOnly.createSeedLifeState({
        width: 10,
        height: 10,
        cols: 2,
        rows: 2,
        tickSpeedMs: 32,
        cells: [],
        framesPerTick: 7,
      })
    ).toEqual({
      width: 10,
      height: 10,
      cols: 2,
      rows: 2,
      tickSpeedMs: 32,
      framesPerTick: 2,
      framesUntilTick: 2,
      generation: 0,
      cells: [],
    });
    expect(
      conwayLifeTestOnly.createBaseStateFields({
        width: 10,
        height: 10,
        cols: 2,
        rows: 2,
        tickSpeedMs: 16,
        cells: [],
      })
    ).toMatchObject({ framesPerTick: 1, framesUntilTick: 1, generation: 0 });
    expect(
      conwayLifeTestOnly.createBaseStateFields({
        width: 10,
        height: 10,
        cols: 2,
        rows: 2,
        tickSpeedMs: 32,
        cells: [],
      })
    ).toMatchObject({ framesPerTick: 2, framesUntilTick: 2 });
    expect(
      conwayLifeTestOnly.createBaseStateFields({
        width: 10,
        height: 10,
        cols: 2,
        rows: 2,
        tickSpeedMs: 32,
        cells: [],
        framesPerTick: 7,
      })
    ).toMatchObject({ framesPerTick: 7, framesUntilTick: 7 });
    expect(
      conwayLifeTestOnly.composeLifeState(
        {
          width: 10,
          height: 10,
          cols: 2,
          rows: 2,
          tickSpeedMs: 16,
          framesPerTick: 2,
          framesUntilTick: 2,
          generation: 3,
          cells: [],
        },
        {}
      )
    ).toMatchObject({ framesPerTick: 2, framesUntilTick: 2, generation: 3 });
  });
});
