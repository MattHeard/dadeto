import { describe, expect, it, jest } from '@jest/globals';
import { batteryBreakout } from '../../../src/core/browser/toys/2026-06-28/batteryBreakout.js';

/**
 * Runs the battery breakout toy with a mocked storage accessor.
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
  const payload = JSON.parse(batteryBreakout(input, env));
  return { payload, storageValue, setLocalPermanentData };
}

describe('batteryBreakout', () => {
  it('renders an initial scene and persists state under BATT4', () => {
    const { payload, storageValue } = runToy(
      JSON.stringify({ width: 240, height: 160 })
    );
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

  it('falls back when storage access is unavailable', () => {
    const payload = JSON.parse(batteryBreakout('{}', new Map()));

    expect(payload.width).toBeGreaterThan(0);
    expect(payload.shapes.some(shape => shape.type === 'circle')).toBe(true);
  });

  it('parses invalid input as null and keeps the seed state', () => {
    const { storageValue } = runToy('   ');

    expect(storageValue.current.BATT4.width).toBe(360);
    expect(storageValue.current.BATT4.status).toBe('ready');
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
    runToy(
      JSON.stringify({ type: 'keydown', key: 'ArrowRight' }),
      storageValue
    );
    const next = runToy('{}', storageValue);
    expect(next.storageValue.current.BATT4.paddle.x).toBeGreaterThan(100);
  });

  it('derives movement from axes in both directions', () => {
    const leftStorage = { current: null };
    runToy(JSON.stringify({ axes: [-1] }), leftStorage);
    const left = runToy('{}', leftStorage);

    const rightStorage = { current: null };
    runToy(JSON.stringify({ axes: [1] }), rightStorage);
    const right = runToy('{}', rightStorage);

    expect(left.storageValue.current.BATT4.paddle.x).toBeLessThan(160);
    expect(right.storageValue.current.BATT4.paddle.x).toBeGreaterThan(160);
  });

  it('handles key releases and capture snapshots', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: 'ArrowLeft' }), storageValue);
    runToy(JSON.stringify({ type: 'keyup', key: 'ArrowLeft' }), storageValue);
    const capture = runToy(
      JSON.stringify({
        type: 'capture',
        capturing: false,
      }),
      storageValue
    );
    const snapshot = runToy(
      JSON.stringify({
        buttons: [true, false, 'x'],
        axes: [1, 'bad'],
        buttonIndex: 1,
        pressed: true,
      }),
      storageValue
    );

    expect(capture.storageValue.current.BATT4.input.keyboard.ArrowLeft).toBe(
      false
    );
    expect(snapshot.storageValue.current.BATT4.input.gamepad.buttons).toEqual([
      true,
      true,
      false,
    ]);
    expect(snapshot.storageValue.current.BATT4.input.gamepad.axes).toEqual([
      1, 0,
    ]);
  });

  it('accepts custom orb speeds from input', () => {
    const { storageValue } = runToy(
      JSON.stringify({ orbSpeedX: 2, orbSpeedY: -1 })
    );

    expect(storageValue.current.BATT4.orb.vx).toBe(2);
    expect(storageValue.current.BATT4.orb.vy).toBe(-1);
  });

  it('updates the captured gamepad buttons by index', () => {
    const storageValue = { current: null };
    runToy(
      JSON.stringify({
        buttons: [false, false, true],
        buttonIndex: 1,
        pressed: true,
      }),
      storageValue
    );

    expect(storageValue.current.BATT4.input.gamepad.buttons).toEqual([
      false,
      true,
      true,
    ]);
  });

  it('falls back through the normalization branches for malformed state', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 'x',
          height: null,
          frame: -1,
          status: 'broken',
          score: 'x',
          lives: 'x',
          faults: 'x',
          input: {
            keyboard: null,
            gamepad: null,
            actions: null,
            previousActions: null,
          },
          paddle: null,
          orb: null,
          cells: [
            {
              id: 'cell-a',
              x: 1,
              y: 1,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'invalid',
            },
            {
              id: 'cell-b',
              x: 2,
              y: 2,
              width: 24,
              height: 10,
              charge: 1,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'invalid',
            },
            {
              id: 'cell-c',
              x: 3,
              y: 3,
              width: 24,
              height: 10,
              charge: 2,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'invalid',
            },
            {
              id: 'cell-d',
              x: 4,
              y: 4,
              width: 24,
              height: 10,
              charge: 4,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'invalid',
            },
            {
              id: 'cell-e',
              x: 5,
              y: 5,
              width: 24,
              height: 10,
              charge: 1,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 1,
              state: 'invalid',
            },
          ],
        },
      },
    };

    runToy('not json', storageValue);

    expect(storageValue.current.BATT4.width).toBe(360);
    expect(storageValue.current.BATT4.height).toBe(240);
    expect(storageValue.current.BATT4.status).toBe('ready');
    expect(storageValue.current.BATT4.input.keyboard).toEqual({});
    expect(storageValue.current.BATT4.input.gamepad.buttons).toEqual([]);
    expect(storageValue.current.BATT4.input.actions.moveLeft).toBe(false);
    expect(storageValue.current.BATT4.paddle.width).toBe(48);
    expect(storageValue.current.BATT4.orb.radius).toBe(4);
    expect(storageValue.current.BATT4.cells).toHaveLength(5);
  });

  it('falls back to the default cell layout when persisted cells are empty', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'ready',
          score: 0,
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
          orb: { x: 90, y: 90, vx: 0, vy: 0, radius: 4, stuckToPaddle: true },
          cells: [],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.BATT4.cells).toHaveLength(9);
  });

  it('toggles pause on successive pause presses', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'running',
          score: 0,
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
          orb: { x: 90, y: 90, vx: 0, vy: 0, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              state: 'empty',
            },
          ],
        },
      },
    };

    runToy(JSON.stringify({ type: 'keydown', key: 'p' }), storageValue);
    const paused = runToy('{}', storageValue);

    expect(paused.storageValue.current.BATT4.status).toBe('paused');

    runToy(JSON.stringify({ type: 'keyup', key: 'p' }), storageValue);
    runToy(JSON.stringify({ type: 'keydown', key: 'p' }), storageValue);
    const resumed = runToy('{}', storageValue);

    expect(resumed.storageValue.current.BATT4.status).toBe('running');
  });

  it('bounces from the right wall and from the paddle face', () => {
    const wallStorage = {
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
          orb: { x: 177, y: 40, vx: 3, vy: -1, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              state: 'empty',
            },
          ],
        },
      },
    };

    const paddleStorage = {
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
          orb: { x: 78, y: 110, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              state: 'empty',
            },
          ],
        },
      },
    };

    const wallNext = runToy('{}', wallStorage);
    const paddleNext = runToy('{}', paddleStorage);

    expect(wallNext.storageValue.current.BATT4.orb.x).toBeLessThan(180);
    expect(wallNext.storageValue.current.BATT4.orb.vx).toBeLessThan(0);
    expect(paddleNext.storageValue.current.BATT4.orb.vy).toBeLessThan(0);
    expect(paddleNext.storageValue.current.BATT4.orb.vx).not.toBe(0);
  });

  it('uses a staggered default cell layout', () => {
    const { storageValue } = runToy(
      JSON.stringify({ width: 240, height: 160 })
    );
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
          paddle: { x: 10, y: 114, width: 48, height: 6, speed: 4 },
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
              state: 'overcharged',
            },
          ],
        },
      },
    };

    const next = runToy(
      JSON.stringify({ type: 'keydown', key: 'r' }),
      storageValue
    );

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
              charge: 1,
              targetCharge: 2,
              maxCharge: 3,
              state: 'charging',
            },
          ],
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

  it('cools down an overcharged cell back to charging', () => {
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
          faults: 1,
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
          orb: { x: 120, y: 90, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 4,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 1,
              state: 'overcharged',
            },
          ],
        },
      },
    };

    const next = runToy('{}', storageValue);

    expect(next.storageValue.current.BATT4.cells[0].state).toBe('charging');
    expect(next.storageValue.current.BATT4.cells[0].charge).toBe(2);
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
              targetCharge: 4,
              maxCharge: 3,
              state: 'charging',
            },
          ],
        },
      },
    };
    const next = runToy('{}', storageValue);
    expect(next.storageValue.current.BATT4.status).toBe('lost');
  });

  it('bounces off walls and the paddle', () => {
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
          orb: { x: 4, y: 4, vx: -3, vy: -3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              state: 'empty',
            },
          ],
        },
      },
    };

    const next = runToy('{}', storageValue);

    expect(next.storageValue.current.BATT4.orb.vx).toBeGreaterThan(0);
    expect(next.storageValue.current.BATT4.orb.vy).toBeGreaterThan(0);
  });

  it('normalizes malformed stored values back to defaults', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 'bad',
          height: null,
          frame: 'bad',
          status: 'bad',
          score: 'bad',
          lives: 'bad',
          faults: 'bad',
          input: {
            keyboard: null,
            gamepad: null,
            actions: null,
            previousActions: null,
          },
          paddle: null,
          orb: null,
          cells: [
            null,
            {},
            {
              id: 12,
              x: 'bad',
              y: 'bad',
              width: -1,
              height: 0,
              charge: 'bad',
              targetCharge: 'bad',
              maxCharge: 'bad',
              overchargeCooldown: 'bad',
              state: 'bad',
            },
            {
              x: 30,
              y: 20,
              width: 24,
              height: 12,
              charge: 1,
              targetCharge: 3,
              maxCharge: 4,
              overchargeCooldown: 0,
              state: 'bad',
            },
            {
              x: 40,
              y: 30,
              width: 24,
              height: 12,
              charge: 3,
              targetCharge: 2,
              maxCharge: 5,
              overchargeCooldown: 0,
              state: 'bad',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.BATT4.width).toBe(360);
    expect(storageValue.current.BATT4.height).toBe(240);
    expect(storageValue.current.BATT4.frame).toBeGreaterThan(0);
    expect(storageValue.current.BATT4.status).toBe('ready');
    expect(storageValue.current.BATT4.score).toBe(0);
    expect(storageValue.current.BATT4.lives).toBe(3);
    expect(storageValue.current.BATT4.faults).toBe(0);
    expect(storageValue.current.BATT4.cells.map(cell => cell.state)).toEqual([
      'empty',
      'empty',
      'charging',
      'stable',
    ]);
  });

  it('normalizes structured persisted gamepad and paddle data', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'ready',
          score: 0,
          lives: 3,
          faults: 0,
          layoutSeed: 2,
          input: {
            keyboard: { ArrowLeft: true, ArrowRight: false },
            gamepad: { buttons: [true, false], axes: [1, '0'] },
            actions: {
              moveLeft: true,
              moveRight: false,
              launchPressed: true,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              moveLeft: false,
              moveRight: true,
              launchPressed: false,
              pausePressed: true,
              resetPressed: false,
            },
          },
          paddle: { x: 15, y: 120, width: 50, height: 7, speed: 5 },
          orb: { x: 44, y: 37, vx: 0, vy: 3, radius: 4, stuckToPaddle: true },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              overchargeCooldown: 0,
              state: 'empty',
            },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.BATT4.input.gamepad.buttons).toEqual([
      true,
      false,
    ]);
    expect(storageValue.current.BATT4.input.gamepad.axes).toEqual([1, 0]);
    expect(storageValue.current.BATT4.input.actions.moveLeft).toBe(true);
    expect(storageValue.current.BATT4.paddle.width).toBe(50);
    expect(storageValue.current.BATT4.orb.radius).toBe(4);
    expect(storageValue.current.BATT4.cells).toHaveLength(1);
  });

  it('loses a life when the orb falls below the paddle lane', () => {
    const storageValue = {
      current: {
        BATT4: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 1,
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
          orb: { x: 60, y: 139, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          cells: [
            {
              id: 'cell-1',
              x: 32,
              y: 32,
              width: 24,
              height: 10,
              charge: 0,
              targetCharge: 2,
              maxCharge: 3,
              state: 'empty',
            },
          ],
        },
      },
    };

    const next = runToy('{}', storageValue);

    expect(next.storageValue.current.BATT4.status).toBe('lost');
    expect(next.storageValue.current.BATT4.lives).toBeLessThanOrEqual(0);
  });
});
