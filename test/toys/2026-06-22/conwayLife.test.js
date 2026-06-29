import { describe, expect, it, jest } from '@jest/globals';
import { conwayLife } from '../../../src/core/browser/toys/2026-06-22/conwayLife.js';
import {
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
});
