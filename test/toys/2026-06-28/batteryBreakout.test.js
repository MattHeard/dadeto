/* eslint-disable jsdoc/require-param-description, jsdoc/require-param-type, jsdoc/require-returns */
import { describe, expect, it, jest } from '@jest/globals';
import { batteryBreakout } from '../../../src/core/browser/toys/2026-06-28/batteryBreakout.js';

function runToy(input, storageValue = { current: null }) {
  const setLocalPermanentData = jest.fn(next => {
    storageValue.current = { ...(storageValue.current || {}), ...next };
    return storageValue.current;
  });
  const env = new Map([['setLocalPermanentData', setLocalPermanentData]]);
  const payload = JSON.parse(batteryBreakout(input, env));
  return { payload, storageValue, setLocalPermanentData };
}

describe('batteryBreakout', () => {
  it('renders an initial scene and persists state under BATT4', () => {
    const { payload, storageValue } = runToy(JSON.stringify({ width: 240, height: 160 }));
    expect(payload.width).toBe(240);
    expect(payload.height).toBe(160);
    expect(payload.shapes.some(shape => shape.type === 'circle')).toBe(true);
    expect(
      payload.shapes.some(
        shape => shape.type === 'rect' && shape.x === 186 && shape.y === 18
      )
    ).toBe(false);
    expect(storageValue.current.BATT4.version).toBe(1);
  });

  it('launches on space and keeps launch edge-triggered', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: 'Space' }), storageValue);
    const second = runToy('{}', storageValue);
    expect(second.storageValue.current.BATT4.status).toBe('running');
    expect(second.storageValue.current.BATT4.orb.stuckToPaddle).toBe(false);
  });

  it('moves paddle with held input', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: 'ArrowRight' }), storageValue);
    const next = runToy('{}', storageValue);
    expect(next.storageValue.current.BATT4.paddle.x).toBeGreaterThan(100);
  });

  it('accepts custom orb speeds from input', () => {
    const { storageValue } = runToy(
      JSON.stringify({ orbSpeedX: 2, orbSpeedY: -1 })
    );

    expect(storageValue.current.BATT4.orb.vx).toBe(2);
    expect(storageValue.current.BATT4.orb.vy).toBe(-1);
  });

  it('uses a staggered default cell layout', () => {
    const { storageValue } = runToy(JSON.stringify({ width: 240, height: 160 }));
    const cells = storageValue.current.BATT4.cells;
    expect(cells).toHaveLength(9);
    expect(new Set(cells.map(cell => `${cell.x},${cell.y}`)).size).toBe(9);
    expect(new Set(cells.map(cell => cell.y)).size).toBeGreaterThan(1);
  });

  it('repeats the same layout for the same seed and changes after reset', () => {
    const storageValue = { current: null };
    const first = runToy(
      JSON.stringify({ width: 240, height: 160, layoutSeed: 7 }),
      storageValue
    );
    const firstLayout = first.storageValue.current.BATT4.cells.map(
      cell => `${cell.x},${cell.y}`
    );
    const second = runToy(
      JSON.stringify({ width: 240, height: 160, layoutSeed: 7 }),
      storageValue
    );
    const secondLayout = second.storageValue.current.BATT4.cells.map(
      cell => `${cell.x},${cell.y}`
    );
    runToy(JSON.stringify({ type: 'keydown', key: 'r' }), storageValue);
    const resetLayout = storageValue.current.BATT4.cells.map(
      cell => `${cell.x},${cell.y}`
    );

    expect(firstLayout).toEqual(secondLayout);
    expect(resetLayout).not.toEqual(firstLayout);
  });

  it('resets to a fresh state on r', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 8,
          status: 'running',
          score: 2,
          lives: 1,
          faults: 2,
          input: { keyboard: {}, gamepad: { buttons: [], axes: [] }, actions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: false, resetPressed: false }, previousActions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: false, resetPressed: false } },
          paddle: { x: 10, y: 114, width: 48, height: 6, speed: 4 },
          orb: { x: 44, y: 37, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [{ id: 'cell-1', x: 32, y: 32, width: 24, height: 10, charge: 3, targetCharge: 2, maxCharge: 3, state: 'overcharged' }],
        },
      },
    };

    const next = runToy(JSON.stringify({ type: 'keydown', key: 'r' }), storageValue);

    expect(next.storageValue.current.BATT4.status).toBe('ready');
    expect(next.storageValue.current.BATT4.score).toBe(0);
    expect(next.storageValue.current.BATT4.lives).toBe(3);
    expect(next.storageValue.current.BATT4.faults).toBe(0);
    expect(next.storageValue.current.BATT4.orb.stuckToPaddle).toBe(true);
  });

  it('charges a cell and eventually stabilizes it', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          faults: 0,
          input: { keyboard: {}, gamepad: { buttons: [], axes: [] }, actions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: false, resetPressed: false }, previousActions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: false, resetPressed: false } },
          paddle: { x: 60, y: 114, width: 48, height: 6, speed: 4 },
          orb: { x: 44, y: 37, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [{ id: 'cell-1', x: 32, y: 32, width: 24, height: 10, charge: 1, targetCharge: 2, maxCharge: 3, state: 'charging' }],
        },
      },
    };
    const next = runToy('{}', storageValue);
    expect(next.storageValue.current.BATT4.cells[0].charge).toBe(2);
    expect(next.storageValue.current.BATT4.cells[0].state).toBe('stable');
  });

  it('keeps stable cells solid after they reach target charge', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 1,
          lives: 3,
          faults: 0,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              moveLeft: false,
              moveRight: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              moveLeft: false,
              moveRight: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
          },
          paddle: { x: 60, y: 114, width: 48, height: 6, speed: 4 },
          orb: { x: 44, y: 37, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 2,
              targetCharge: 2,
              maxCharge: 3,
              state: 'stable',
            },
          ],
        },
      },
    };

    const next = runToy('{}', storageValue);

    expect(next.storageValue.current.BATT4.cells[0].state).toBe('stable');
    expect(next.storageValue.current.BATT4.orb.x).not.toBe(44);
  });

  it('can push a stable cell into overcharged on a later hit', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 1,
          lives: 3,
          faults: 0,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              moveLeft: false,
              moveRight: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              moveLeft: false,
              moveRight: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
          },
          paddle: { x: 60, y: 114, width: 48, height: 6, speed: 4 },
          orb: { x: 44, y: 37, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 3,
              targetCharge: 2,
              maxCharge: 3,
              state: 'stable',
            },
          ],
        },
      },
    };

    const next = runToy('{}', storageValue);

    expect(next.storageValue.current.BATT4.cells[0].state).toBe('overcharged');
    expect(next.storageValue.current.BATT4.faults).toBe(1);
  });

  it('overcharges and can lose after too many faults', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          faults: 4,
          input: { keyboard: {}, gamepad: { buttons: [], axes: [] }, actions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: false, resetPressed: false }, previousActions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: false, resetPressed: false } },
          paddle: { x: 60, y: 114, width: 48, height: 6, speed: 4 },
          orb: { x: 44, y: 37, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [{ id: 'cell-1', x: 32, y: 32, width: 24, height: 10, charge: 3, targetCharge: 4, maxCharge: 3, state: 'charging' }],
        },
      },
    };
    const next = runToy('{}', storageValue);
    expect(next.storageValue.current.BATT4.status).toBe('lost');
  });
});
