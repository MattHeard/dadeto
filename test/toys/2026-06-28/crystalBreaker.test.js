/* eslint-disable jsdoc/require-param-description, jsdoc/require-param-type, jsdoc/require-returns */
import { describe, expect, it, jest } from '@jest/globals';
import { crystalBreaker } from '../../../src/core/browser/toys/2026-06-28/crystalBreaker.js';

function runToy(input, storageValue = { current: null }) {
  const setLocalPermanentData = jest.fn(next => {
    storageValue.current = { ...(storageValue.current || {}), ...next };
    return storageValue.current;
  });
  const env = new Map([['setLocalPermanentData', setLocalPermanentData]]);
  const payload = JSON.parse(crystalBreaker(input, env));
  return { payload, storageValue, setLocalPermanentData };
}

describe('crystalBreaker', () => {
  it('renders an initial scene with HUD text and persists state under CRYS1', () => {
    const { payload, storageValue } = runToy(JSON.stringify({ width: 240, height: 160 }));
    expect(payload.width).toBe(240);
    expect(payload.height).toBe(160);
    expect(payload.shapes.some(shape => shape.type === 'text')).toBe(true);
    expect(storageValue.current.CRYS1.version).toBe(1);
  });

  it('launches on space and keeps launch edge-triggered', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: ' ' }), storageValue);
    const second = runToy('{}', storageValue);
    expect(second.storageValue.current.CRYS1.status).toBe('running');
    expect(second.storageValue.current.CRYS1.orb.stuckToPaddle).toBe(false);
  });

  it('moves paddle with held input', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: 'ArrowRight' }), storageValue);
    const next = runToy('{}', storageValue);
    expect(next.storageValue.current.CRYS1.paddle.x).toBeGreaterThan(100);
  });

  it('keeps held left input active across frames without snapping back to center', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: 'ArrowLeft' }), storageValue);
    const first = runToy('{}', storageValue);
    const firstX = first.storageValue.current.CRYS1.paddle.x;
    const second = runToy('{}', storageValue);
    const secondX = second.storageValue.current.CRYS1.paddle.x;

    expect(firstX).toBeLessThan(156);
    expect(secondX).toBeLessThan(firstX);
  });

  it('places HUD text within the canvas width', () => {
    const { payload } = runToy(JSON.stringify({ width: 360, height: 240 }));
    const hudTexts = payload.shapes.filter(shape => shape.type === 'text');

    expect(hudTexts).toHaveLength(4);
    expect(Math.max(...hudTexts.map(shape => shape.x))).toBeLessThan(360);
  });

  it('reduces crystal hp and changes state on collision', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          combo: 0,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: false, resetPressed: false },
            previousActions: { moveLeft: false, moveRight: false, launchPressed: false, pausePressed: false, resetPressed: false },
          },
          paddle: { x: 60, y: 114, width: 48, height: 6, speed: 4 },
          orb: { x: 40, y: 36, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          crystals: [{ id: 'crystal-1', x: 32, y: 32, width: 24, height: 14, hp: 2, maxHp: 2, fracture: 0, state: 'whole' }],
        },
      },
    };

    const next = runToy('{}', storageValue);
    expect(next.storageValue.current.CRYS1.score).toBeGreaterThan(0);
    expect(next.storageValue.current.CRYS1.crystals[0].state).toBe('fractured');
  });

  it('handles malformed persisted state by falling back to a valid scene', () => {
    const storageValue = { current: { CRYS1: { version: 999 } } };
    const next = runToy('{}', storageValue);
    expect(next.storageValue.current.CRYS1.version).toBe(1);
    expect(next.payload.shapes.some(shape => shape.type === 'text')).toBe(true);
  });
});
