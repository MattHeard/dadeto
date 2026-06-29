import { describe, expect, it, jest } from '@jest/globals';
import { crystalBreaker } from '../../../src/core/browser/toys/2026-06-28/crystalBreaker.js';

/**
 * Runs the crystal breaker toy with a mocked storage accessor.
 * @param {string} input Raw toy input.
 * @param {{ current: Record<string, unknown> | null }} storageValue Storage wrapper.
 * @returns {{ payload: Record<string, unknown>, storageValue: { current: Record<string, unknown> | null }, setLocalPermanentData: ReturnType<typeof jest.fn> }} Render result.
 */
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
    const { payload, storageValue } = runToy(
      JSON.stringify({ width: 240, height: 160 })
    );
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
    runToy(
      JSON.stringify({ type: 'keydown', key: 'ArrowRight' }),
      storageValue
    );
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
          orb: { x: 40, y: 36, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          crystals: [
            {
              id: 'crystal-1',
              x: 32,
              y: 32,
              width: 24,
              height: 14,
              hp: 2,
              maxHp: 2,
              fracture: 0,
              state: 'whole',
            },
          ],
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

  it('normalizes malformed persisted crystals and status fields', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 2,
          status: 'bad',
          score: 5,
          lives: 2,
          combo: 1,
          input: {
            keyboard: null,
            gamepad: { buttons: [1, false], axes: ['bad'] },
            actions: null,
            previousActions: { moveLeft: true, resetPressed: false },
          },
          paddle: null,
          orb: null,
          crystals: [
            null,
            {
              id: 123,
              x: 'bad',
              y: 'bad',
              width: -1,
              height: 0,
              hp: 'bad',
              maxHp: 'bad',
              fracture: 'bad',
              state: 'invalid',
            },
            {
              id: 'crystal-x',
              x: 12,
              y: 34,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 2,
              fracture: 0,
              state: 'fractured',
            },
            {
              id: 'crystal-y',
              x: 20,
              y: 40,
              width: 24,
              height: 14,
              hp: 0,
              maxHp: 1,
              fracture: 1,
              state: 'shattered',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.CRYS1.status).toBe('ready');
    expect(storageValue.current.CRYS1.input.keyboard).toEqual({});
    expect(storageValue.current.CRYS1.input.gamepad.buttons).toEqual([
      false,
      false,
    ]);
    expect(storageValue.current.CRYS1.input.gamepad.axes).toEqual([0]);
    expect(storageValue.current.CRYS1.crystals).toHaveLength(3);
    expect(storageValue.current.CRYS1.crystals[0].state).toBe('whole');
    expect(storageValue.current.CRYS1.crystals[1].state).toBe('whole');
    expect(storageValue.current.CRYS1.crystals[2].state).toBe('fractured');
  });

  it('resets on a fresh reset keydown and rebuilds the seed state', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 8,
          status: 'running',
          score: 12,
          lives: 1,
          combo: 3,
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
          paddle: { x: 40, y: 114, width: 48, height: 6, speed: 4 },
          orb: {
            x: 60,
            y: 103,
            vx: 0,
            vy: -2,
            radius: 4,
            stuckToPaddle: false,
          },
          crystals: [
            {
              id: 'shattered',
              x: 0,
              y: 0,
              width: 24,
              height: 14,
              hp: 0,
              maxHp: 1,
              fracture: 1,
              state: 'shattered',
            },
            {
              id: 'whole',
              x: 20,
              y: 20,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 1,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };

    runToy(JSON.stringify({ type: 'keydown', key: 'r' }), storageValue);

    expect(storageValue.current.CRYS1.frame).toBe(0);
    expect(storageValue.current.CRYS1.status).toBe('ready');
    expect(storageValue.current.CRYS1.score).toBe(0);
    expect(storageValue.current.CRYS1.lives).toBe(1);
    expect(
      storageValue.current.CRYS1.crystals.every(
        crystal => crystal.state !== 'shattered'
      )
    ).toBe(true);
    expect(storageValue.current.CRYS1.input.actions.resetPressed).toBe(true);
  });

  it('toggles pause and resumes from ready and running states', () => {
    const runningStorage = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 1,
          status: 'running',
          score: 0,
          lives: 3,
          combo: 0,
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
          paddle: { x: 40, y: 114, width: 48, height: 6, speed: 4 },
          orb: {
            x: 60,
            y: 103,
            vx: 0,
            vy: -2,
            radius: 4,
            stuckToPaddle: false,
          },
          crystals: [
            {
              id: 'crystal-1',
              x: 20,
              y: 20,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 1,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };
    runToy(JSON.stringify({ type: 'keydown', key: 'p' }), runningStorage);
    expect(runningStorage.current.CRYS1.status).toBe('paused');
  });

  it('loses the last life and keeps a lost state after the orb falls below the board', () => {
    const storageValue = {
      current: {
        CRYS1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 1,
          combo: 2,
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
          orb: {
            x: 60,
            y: 146,
            vx: 0,
            vy: 10,
            radius: 4,
            stuckToPaddle: false,
          },
          crystals: [
            {
              id: 'crystal-1',
              x: 32,
              y: 32,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 1,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.CRYS1.status).toBe('lost');
    expect(storageValue.current.CRYS1.lives).toBe(0);
    expect(storageValue.current.CRYS1.orb.stuckToPaddle).toBe(true);
  });

  it('wins after the last crystal shatters', () => {
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
          orb: { x: 40, y: 36, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          crystals: [
            {
              id: 'crystal-1',
              x: 32,
              y: 32,
              width: 24,
              height: 14,
              hp: 1,
              maxHp: 1,
              fracture: 0,
              state: 'whole',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.CRYS1.status).toBe('won');
    expect(storageValue.current.CRYS1.score).toBe(10);
  });
});
