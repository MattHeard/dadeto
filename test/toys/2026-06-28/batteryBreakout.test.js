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
