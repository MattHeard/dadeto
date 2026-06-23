import { describe, expect, it, jest } from '@jest/globals';
import { conwayLife } from '../../../src/core/browser/toys/2026-06-22/conwayLife.js';

const getCanvasPayload = (input, storageValue) => {
  const setLocalPermanentData = jest.fn(next => {
    storageValue.current = {
      ...(storageValue.current || {}),
      ...next,
    };
    return storageValue.current;
  });
  const env = new Map([['setLocalPermanentData', setLocalPermanentData]]);
  const payload = JSON.parse(conwayLife(input, env));
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
});
