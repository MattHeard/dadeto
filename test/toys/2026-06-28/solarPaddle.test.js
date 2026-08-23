import { describe, expect, it, jest } from '@jest/globals';
import {
  resolvePaddle,
  separateOrbFromPanel,
  reflectOrbVelocityFromPanel,
  solarPaddle,
  solarPaddleTestOnly as h,
} from '../../../src/core/browser/toys/2026-06-28/solarPaddle.js';

describe('solarPaddle helper contracts', () => {
  it('covers parsing, normalization, layout, and input boundaries', () => {
    expect(h.parseInput('')).toBeNull();
    expect(h.parseInput('null')).toBeNull();
    expect(h.parseInput('{"width":240}')).toEqual({ width: 240 });
    expect(h.parseObjectRecord('[]')).toBeNull();
    expect(h.normalizeStatus('running')).toBe('running');
    expect(h.normalizeStatus('bad')).toBe('ready');
    expect(h.normalizeSeedWidth({}, null, h.createSeedDefaults())).toBe(360);
    expect(h.normalizeSeedHeight({ height: 160 }, null, h.createSeedDefaults())).toBe(160);
    expect(h.normalizeSeedLives({ lives: 2 }, null, h.createSeedDefaults())).toBe(2);
    expect(h.normalizeSeedLayout({ layoutSeed: 3 }, null, h.createSeedDefaults())).toBe(3);
    expect(h.normalizeGamepadButtons([true, 0])).toEqual([true, false]);
    expect(h.normalizeGamepadAxes([1, 'bad'])).toEqual([1, 0]);
    expect(h.normalizeActions({ left: true, right: false, launch: true, pause: false, reset: true }))
      .toMatchObject({ left: true, launch: true, reset: true });
    expect(h.normalizeActions({ left: false, right: false, launch: false, pause: false, reset: false }))
      .toEqual({ left: false, right: false, launch: false, pause: false, reset: false });
    expect(h.normalizeEdgeActions({ left: true, right: false, launchPressed: true, pausePressed: false, resetPressed: true }))
      .toEqual({ left: true, right: false, launchPressed: true, pausePressed: false, resetPressed: true });
    expect(h.normalizeInputState(null)).toMatchObject({ keyboard: {}, gamepad: { buttons: [], axes: [] } });
    const seedOptions = h.createSeedOptions();
    expect(h.createState(seedOptions)).toMatchObject({ version: 1, width: 360, height: 240, frame: 0, status: 'ready', lives: 3, paddle: { width: 52, height: 7 }, orb: { radius: 4, stuckToPaddle: true } });
    expect(h.normalizeState({ version: 0 })).toBeNull();
    expect(h.normalizeState({ version: 1 })).toMatchObject({ version: 1, width: 360, height: 240, status: 'ready', lives: 3 });
    expect(h.normalizePanels(240, 160, 2)).toHaveLength(12);
    expect(h.normalizePanelsFromState([])).toHaveLength(12);
    expect(h.getPanelColumnOffset(0)).toBe(0);
    expect(h.getPanelRowOffset(1)).toBe(2);
    expect(h.shufflePositions([{ x: 1, y: 1 }, { x: 2, y: 2 }], 3)).toHaveLength(2);
    expect(h.clamp(-1, 0, 10)).toBe(0);
    expect(h.clamp(11, 0, 10)).toBe(10);
    expect(h.clamp(5, 0, 10)).toBe(5);
    expect(h.normalizePaddle({ x: 12, y: 40, width: 60, height: 8, speed: 5 }, 160))
      .toEqual({ x: 12, y: 40, width: 60, height: 8, speed: 5 });
    expect(h.normalizeOrb({ x: 10, y: 12, vx: 2, vy: -3, radius: 5, stuckToPaddle: true }))
      .toMatchObject({ x: 10, y: 12, vx: 2, vy: -3, radius: 5, stuckToPaddle: true });
    expect(h.normalizeNonNegativeInteger(-1, 7)).toBe(7);
    expect(h.normalizeNonNegativeInteger(2.6, 7)).toBe(3);
    expect(h.normalizeNumber(0, 4)).toBe(4);
    expect(h.normalizeNumber(2.5, 4)).toBe(2.5);
    const keyboard = { ArrowLeft: true, a: true, A: true, ArrowRight: true, d: true, D: true, Space: true, ' ': true, Button0: true, p: true, P: true, Button9: true, r: true, R: true, Button8: true };
    const gamepad = { buttons: Array(10).fill(true), axes: [-1, 1] };
    expect(h.isLeftActionPressed(keyboard, gamepad)).toBe(true);
    expect(h.isRightActionPressed(keyboard, gamepad)).toBe(true);
    expect(h.isLaunchActionPressed(keyboard, gamepad)).toBe(true);
    expect(h.isPauseActionPressed(keyboard, gamepad)).toBe(true);
    expect(h.isResetActionPressed(keyboard, gamepad)).toBe(true);
    expect(h.isAxisLeft(-0.5)).toBe(true);
    expect(h.isAxisRight(0.5)).toBe(true);
    expect(h.createEdgeActions({ left: true, right: false, launch: true, pause: false, reset: true }, { left: false, right: false, launch: false, pause: false, reset: false }))
      .toEqual({ left: true, right: false, launchPressed: true, pausePressed: false, resetPressed: true });
  });

  it('covers input transitions, physics boundaries, and rendering helpers', () => {
    const keyboard = {};
    h.applyKeyboardInput({ type: 'keydown', key: 'ArrowLeft' }, keyboard);
    expect(keyboard.ArrowLeft).toBe(true);
    h.applyKeyboardInput({ type: 'keyup', key: 'ArrowLeft' }, keyboard);
    expect(keyboard.ArrowLeft).toBe(false);
    const gamepad = { buttons: [], axes: [] };
    h.applyGamepadInput({ buttons: [true], axes: ['bad'], buttonIndex: 2, pressed: true }, gamepad);
    expect(gamepad).toEqual({ buttons: [true, undefined, true], axes: [0] });
    expect(h.createActionsFromState({}, { buttons: [true], axes: [] }).actions.launch).toBe(true);
    expect(h.normalizeBooleanRecord({ a: true, b: 1 })).toEqual({ a: true, b: false });
    expect(h.getPanelId('custom', 2)).toBe('custom');
    expect(h.getPanelId(null, 2)).toBe('p3');
    expect(h.normalizePanelFromState({ id: 'x', x: 4, y: 5, width: 20, height: 10, charge: true }, 0))
      .toEqual({ id: 'x', x: 4, y: 5, width: 20, height: 10, charge: true });
    expect(h.buildPanelPositions(240, 160, 28, 10)).toHaveLength(15);
    expect(h.isAxisLeft(-0.1)).toBe(false);
    expect(h.isAxisRight(0.1)).toBe(false);

    const state = h.createState(h.createSeedOptions());
    state.status = 'ready';
    h.applyGameplayInput(state, { actions: { left: false, right: false, launch: true, pause: false, reset: false }, edgeActions: { left: false, right: false, launchPressed: true, pausePressed: false, resetPressed: false } });
    expect(state.status).toBe('running');
    state.status = 'running';
    h.applyGameplayInput(state, { actions: { left: false, right: false, launch: false, pause: true, reset: false }, edgeActions: { left: false, right: false, launchPressed: false, pausePressed: true, resetPressed: false } });
    expect(state.status).toBe('paused');
    h.movePaddle(state, { left: true, right: false });
    expect(state.paddle.x).toBeGreaterThanOrEqual(0);
    h.stickOrbToPaddle(state);
    expect(state.orb.y).toBe(state.paddle.y - state.orb.radius - 1);
    state.orb.x = 1; state.orb.y = 1; state.orb.vx = -2; state.orb.vy = -2;
    h.resolveWalls(state);
    expect(state.orb.vx).toBe(2);
    expect(state.orb.vy).toBe(2);
    expect(h.getPanelCollisionAxis({ x: 14, y: 15, radius: 4 }, { x: 0, y: 0, width: 28, height: 10 })).toBe('y');
    expect(h.circleIntersectsPanel({ x: 5, y: 5, radius: 2 }, { x: 0, y: 0, width: 10, height: 10 })).toBe(true);
    expect(h.circleIntersectsPanel({ x: 30, y: 30, radius: 2 }, { x: 0, y: 0, width: 10, height: 10 })).toBe(false);
    const panel = { x: 0, y: 0, width: 20, height: 10, charge: false };
    state.panels = [panel]; state.orb = { x: 10, y: 5, vx: 1, vy: -1, radius: 3, stuckToPaddle: false }; state.score = 0;
    h.resolvePanels(state);
    expect(panel.charge).toBe(true);
    expect(state.score).toBe(1);
    state.panels = [{ ...panel, charge: true }];
    h.resolveWinLoss(state);
    expect(state.status).toBe('won');
    state.lives = 1; state.orb.y = state.height + 10; state.status = 'running';
    h.resolveBottom(state);
    expect(state.status).toBe('lost');
    expect(h.getPanelFill(true)).not.toBe(h.getPanelFill(false));
    expect(h.getOrbFill('lost')).not.toBe(h.getOrbFill('running'));
    expect(h.toCanvasPayload(state).shapes).toHaveLength(6);
    const persist = jest.fn(); h.persistState(persist, state); expect(persist).toHaveBeenCalledWith({ SOLA1: state });
  });

  it('covers seed fallback, merge, reset, and persistence boundaries', () => {
    const defaults = h.createSeedDefaults();
    const fallback = { width: 200, height: 140, layoutSeed: 9, lives: 2 };
    expect(h.normalizeSeedWidth({}, fallback, defaults)).toBe(200);
    expect(h.normalizeSeedHeight({}, fallback, defaults)).toBe(140);
    expect(h.normalizeSeedLayout({}, fallback, defaults)).toBe(9);
    expect(h.normalizeSeedLives({}, fallback, defaults)).toBe(2);
    const seed = h.createSeedState({}, fallback);
    expect(seed.width).toBe(200);
    expect(h.buildResetFallback(seed)).toEqual({ width: 200, height: 140, lives: 2, layoutSeed: undefined });
    expect(h.buildResetFallback(null)).toBeUndefined();
    const merged = h.mergeSeedAndState(seed, h.createSeedState({ width: 220, height: 150 }, fallback));
    expect(merged.width).toBe(220);
    expect(merged.height).toBe(150);
    expect(merged.orb.radius).toBe(4);
    expect(h.buildMergedState(true, seed, seed)).toBe(seed);
    expect(h.buildMergedState(false, seed, seed)).not.toBe(seed);
    expect(h.createResetSeedState({}, seed).panels).not.toEqual(seed.panels);
    expect(h.finalizeNextState(seed, 4, h.createInitialInputState()).frame).toBe(5);
    expect(h.updateInputState(h.createInitialInputState(), { type: 'keydown', key: 'ArrowRight' }).actions.right).toBe(true);
    expect(h.readPersistedState(() => ({ SOLA1: seed }))).toMatchObject(seed);
    expect(h.readPersistedState(null)).toBeNull();
  });

  it('locks exact defaults and invalid-input handling', () => {
    expect(h.getStorageAccessor(null)).toBeNull();
    expect(h.getStorageAccessor(new Map())).toBeNull();
    expect(h.parseInput('{}')).toEqual({});
    expect(h.parseInput('{bad')).toBeNull();
    expect(h.parseObjectRecord('1')).toBeNull();
    expect(h.normalizeBooleanRecord([])).toEqual({});
    expect(h.normalizeGamepadState([])).toEqual({ buttons: [], axes: [] });
    expect(h.normalizeGamepadButtons(null)).toEqual([]);
    expect(h.normalizeGamepadAxes(null)).toEqual([]);
    expect(h.normalizeActions([])).toEqual({ left: false, right: false, launch: false, pause: false, reset: false });
    expect(h.normalizeEdgeActions([])).toEqual({ left: false, right: false, launchPressed: false, pausePressed: false, resetPressed: false });
    expect(h.createInitialInputState()).toEqual({
      keyboard: {}, gamepad: { buttons: [], axes: [] },
      actions: { left: false, right: false, launch: false, pause: false, reset: false },
      edgeActions: { left: false, right: false, launchPressed: false, pausePressed: false, resetPressed: false },
      previousActions: { left: false, right: false, launch: false, pause: false, reset: false },
    });
    expect(h.normalizePanelFromState({}, 0)).toEqual({ id: 'p1', x: 0, y: 0, width: 20, height: 10, charge: false });
    expect(h.normalizePanelsFromState([null])).toEqual([]);
    expect(h.getPanelColumnOffset(1)).toBe(6);
    expect(h.getPanelRowOffset(1)).toBe(2);
    expect(h.normalizeNumber('bad', 7)).toBe(7);
    expect(h.normalizeNonNegativeInteger(0, 7)).toBe(0);
    expect(h.normalizePaddle(null, 100)).toMatchObject({ width: 52, height: 7, speed: 4 });
    expect(h.normalizeOrb(null)).toMatchObject({ radius: 4, vx: 1, vy: -2, stuckToPaddle: true });
    expect(h.isLeftActionPressed({}, { buttons: [], axes: [] })).toBe(false);
    expect(h.isRightActionPressed({}, { buttons: [], axes: [] })).toBe(false);
    expect(h.isLaunchActionPressed({}, { buttons: [], axes: [] })).toBe(false);
    expect(h.isPauseActionPressed({}, { buttons: [], axes: [] })).toBe(false);
    expect(h.isResetActionPressed({}, { buttons: [], axes: [] })).toBe(false);
  });

  it('covers collision axes, pause toggles, and payload geometry', () => {
    const state = h.createState(h.createSeedOptions());
    state.status = 'paused';
    h.applyGameplayInput(state, { actions: { left: false, right: false, launch: false, pause: true, reset: false }, edgeActions: { left: false, right: false, launchPressed: false, pausePressed: true, resetPressed: false } });
    expect(state.status).toBe('running');
    h.movePaddle(state, { left: true, right: false });
    h.movePaddle(state, { left: false, right: true });
    expect(state.paddle.x).toBeGreaterThanOrEqual(0);
    state.orb.stuckToPaddle = false;
    state.orb.x = 1; state.orb.y = 50; state.orb.vx = -1; state.orb.vy = 1;
    h.stepSimulation(state);
    expect(state.orb.x).toBeGreaterThanOrEqual(state.orb.radius);
    state.orb.x = state.paddle.x + state.paddle.width / 2;
    state.orb.y = state.paddle.y - 1;
    state.orb.vy = 2;
    resolvePaddle(state);
    expect(state.orb.vy).toBeLessThan(0);
    const orb = { x: 5, y: 5, vx: 2, vy: 3, radius: 2, stuckToPaddle: false };
    const panel = { x: 0, y: 0, width: 10, height: 10, charge: false };
    reflectOrbVelocityFromPanel(orb, 'x'); expect(orb.vx).toBe(-2);
    reflectOrbVelocityFromPanel(orb, 'y'); expect(orb.vy).toBe(-3);
    separateOrbFromPanel(orb, panel, 'x'); expect(orb.x).not.toBe(5);
    separateOrbFromPanel(orb, panel, 'y'); expect(orb.y).not.toBe(5);
    state.lives = 2; state.status = 'running'; state.orb.y = state.height + 1;
    h.resolveBottom(state);
    expect(state.lives).toBe(1);
    expect(state.status).toBe('ready');
    expect(state.orb.stuckToPaddle).toBe(true);
    const payload = h.toCanvasPayload(state);
    expect(payload.width).toBe(state.width);
    expect(payload.shapes[0]).toMatchObject({ type: 'rect', x: 0, y: 0, fill: '#0b1220' });
    expect(payload.shapes.at(-1)).toMatchObject({ type: 'rect', x: 18, height: 4 });
  });

  it('distinguishes every keyboard and gamepad action source', () => {
    const emptyPad = { buttons: [], axes: [0] };
    for (const key of ['ArrowLeft', 'a', 'A']) {
      expect(h.isLeftActionPressed({ [key]: true }, emptyPad)).toBe(true);
    }
    for (const key of ['ArrowRight', 'd', 'D']) {
      expect(h.isRightActionPressed({ [key]: true }, emptyPad)).toBe(true);
    }
    for (const key of ['Space', ' ', 'Button0']) {
      expect(h.isLaunchActionPressed({ [key]: true }, emptyPad)).toBe(true);
    }
    for (const key of ['p', 'P', 'Button9']) {
      expect(h.isPauseActionPressed({ [key]: true }, emptyPad)).toBe(true);
    }
    for (const key of ['r', 'R', 'Button8']) {
      expect(h.isResetActionPressed({ [key]: true }, emptyPad)).toBe(true);
    }
    expect(h.isLeftActionPressed({}, { buttons: [], axes: [-1] })).toBe(true);
    expect(h.isRightActionPressed({}, { buttons: [], axes: [1] })).toBe(true);
    expect(h.isLaunchActionPressed({}, { buttons: [true], axes: [] })).toBe(true);
    expect(h.isPauseActionPressed({}, { buttons: Array(10).fill(false).map((_, i) => i === 9), axes: [] })).toBe(true);
    expect(h.isResetActionPressed({}, { buttons: Array(9).fill(false).map((_, i) => i === 8), axes: [] })).toBe(true);
  });
});

/**
 * Run the toy with a mock persistence store.
 * @param {unknown} input Toy input.
 * @param {{ current: Record<string, unknown> | null }} [storageValue] Storage snapshot.
 * @returns {string} Serialized canvas payload.
 */
function runToy(input, storageValue = { current: null }) {
  const setLocalPermanentData = jest.fn(next => {
    storageValue.current = {
      ...(storageValue.current || {}),
      ...next,
    };
    return storageValue.current;
  });
  const env = new Map([['setLocalPermanentData', setLocalPermanentData]]);
  const payload = JSON.parse(solarPaddle(input, env));
  return { payload, storageValue, setLocalPermanentData };
}

describe('solarPaddle', () => {
  it('renders an initial scene and persists state', () => {
    const { payload, storageValue, setLocalPermanentData } = runToy(
      JSON.stringify({ width: 240, height: 160 })
    );

    expect(payload.width).toBe(240);
    expect(payload.height).toBe(160);
    expect(payload.shapes[0].fill).toBe('#0b1220');
    expect(payload.shapes.some(shape => shape.type === 'circle')).toBe(true);
    expect(storageValue.current.SOLA1.version).toBe(1);
    expect(setLocalPermanentData).toHaveBeenCalledTimes(2);
  });

  it('falls back when storage access is unavailable', () => {
    const payload = JSON.parse(solarPaddle('{}', new Map()));

    expect(payload.width).toBeGreaterThan(0);
    expect(payload.shapes.some(shape => shape.type === 'circle')).toBe(true);
  });

  it('falls back when the environment has no storage getter', () => {
    const payload = JSON.parse(solarPaddle('{}', {}));

    expect(payload.width).toBeGreaterThan(0);
    expect(payload.shapes.some(shape => shape.type === 'circle')).toBe(true);
  });

  it('treats blank input as null and uses the default seed', () => {
    const storageValue = { current: null };

    runToy('   ', storageValue);

    expect(storageValue.current.SOLA1.width).toBe(360);
    expect(storageValue.current.SOLA1.status).toBe('ready');
  });

  it('keeps launch edge-triggered across repeated frames', () => {
    const storageValue = { current: null };
    const first = runToy(
      JSON.stringify({ type: 'keydown', key: 'Space' }),
      storageValue
    );
    const firstState = structuredClone(first.storageValue.current.SOLA1);
    const second = runToy('{}', storageValue);
    const secondState = structuredClone(second.storageValue.current.SOLA1);

    expect(firstState.status).toBe('running');
    expect(firstState.orb.stuckToPaddle).toBe(false);
    expect(secondState.frame).toBe(2);
    expect(secondState.status).toBe('running');
  });

  it('moves the paddle with held keyboard input', () => {
    const storageValue = { current: null };
    runToy(
      JSON.stringify({ type: 'keydown', key: 'ArrowRight' }),
      storageValue
    );
    const { storageValue: nextStorage } = runToy('{}', storageValue);

    expect(nextStorage.current.SOLA1.paddle.x).toBeGreaterThan(104);
  });

  it('accepts custom orb speeds from input', () => {
    const { storageValue } = runToy(
      JSON.stringify({ orbSpeedX: 2, orbSpeedY: -1 })
    );

    expect(storageValue.current.SOLA1.orb.vx).toBe(2);
    expect(storageValue.current.SOLA1.orb.vy).toBe(-1);
  });

  it('uses a staggered default panel layout', () => {
    const { storageValue } = runToy(
      JSON.stringify({ width: 240, height: 160 })
    );
    const panels = storageValue.current.SOLA1.panels;
    expect(panels).toHaveLength(12);
    expect(new Set(panels.map(panel => `${panel.x},${panel.y}`)).size).toBe(12);
    expect(new Set(panels.map(panel => panel.y)).size).toBeGreaterThan(1);
  });

  it('keeps the seeded layout stable when the seed is zero', () => {
    const { storageValue } = runToy(
      JSON.stringify({ width: 240, height: 160, layoutSeed: 0 })
    );

    expect(storageValue.current.SOLA1.panels).toHaveLength(12);
  });

  it('repeats the same layout for the same seed and changes after reset', () => {
    const storageValue = { current: null };
    const first = runToy(
      JSON.stringify({ width: 240, height: 160, layoutSeed: 7 }),
      storageValue
    );
    const firstLayout = first.storageValue.current.SOLA1.panels.map(
      panel => `${panel.x},${panel.y}`
    );
    const second = runToy(
      JSON.stringify({ width: 240, height: 160, layoutSeed: 7 }),
      storageValue
    );
    const secondLayout = second.storageValue.current.SOLA1.panels.map(
      panel => `${panel.x},${panel.y}`
    );
    runToy(JSON.stringify({ type: 'keydown', key: 'r' }), storageValue);
    const resetLayout = storageValue.current.SOLA1.panels.map(
      panel => `${panel.x},${panel.y}`
    );

    expect(firstLayout).toEqual(secondLayout);
    expect(resetLayout).not.toEqual(firstLayout);
  });
});

describe('solarPaddle reset and collision setup', () => {
  it('rebuilds a fresh layout on reset from persisted state', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 240,
          height: 160,
          frame: 4,
          status: 'running',
          score: 2,
          lives: 2,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 80, y: 70, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [],
        },
      },
    };

    runToy(JSON.stringify({ type: 'keydown', key: 'r' }), storageValue);

    expect(storageValue.current.SOLA1.status).toBe('ready');
    expect(storageValue.current.SOLA1.lives).toBe(2);
  });

  it('uses the fallback seed when reset is requested without persisted state', () => {
    const storageValue = { current: null };

    runToy(JSON.stringify({ type: 'keydown', key: 'r' }), storageValue);

    expect(storageValue.current.SOLA1.status).toBe('ready');
    expect(storageValue.current.SOLA1.panels).toHaveLength(12);
  });

  it('falls back to the default orb speed when a centered paddle hit would clamp to zero', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: {
            x: 86,
            y: 120,
            vx: -0.5185185185185185,
            vy: 3,
            radius: 4,
            stuckToPaddle: false,
          },
          panels: [],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.orb.vx).toBeCloseTo(-0.5584045584045584);
  });
});

describe('solarPaddle gameplay state', () => {
  it('pauses and resumes on repeated pause presses without duplicating the edge', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: 'Space' }), storageValue);
    const paused = runToy(
      JSON.stringify({ type: 'keydown', key: 'P' }),
      storageValue
    );
    const pausedState = structuredClone(paused.storageValue.current.SOLA1);
    const repeated = runToy('{}', storageValue);
    const repeatedState = structuredClone(repeated.storageValue.current.SOLA1);
    runToy(JSON.stringify({ type: 'keyup', key: 'P' }), storageValue);
    const resumed = runToy(
      JSON.stringify({ type: 'keydown', key: 'P' }),
      storageValue
    );
    const resumedState = structuredClone(resumed.storageValue.current.SOLA1);

    expect(pausedState.status).toBe('paused');
    expect(repeatedState.status).toBe('paused');
    expect(resumedState.status).toBe('running');
  });

  it('charges a panel and increments score on collision', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 40, y: 36, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: false },
          ],
        },
      },
    };

    const { storageValue: nextStorage } = runToy('{}', storageValue);

    expect(nextStorage.current.SOLA1.score).toBe(1);
    expect(nextStorage.current.SOLA1.panels[0].charge).toBe(true);
  });

  it('separates the orb from a panel cluster instead of trapping it in place', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 40, y: 34, vx: 0, vy: 1, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 52, y: 32, width: 24, height: 10, charge: false },
            { id: 'p2', x: 82, y: 32, width: 24, height: 10, charge: false },
          ],
        },
      },
    };

    const { storageValue: nextStorage } = runToy('{}', storageValue);
    const nextState = nextStorage.current.SOLA1;

    expect(nextState.score).toBe(1);
    expect(nextState.panels.filter(panel => panel.charge)).toHaveLength(1);
    expect(nextState.orb.y).not.toBe(35);
    expect(nextState.orb.vy === 0).toBe(false);
  });
});

describe('solarPaddle storage normalization', () => {
  it('normalizes malformed wrapped storage back to a fresh seed', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 'x',
          height: null,
          frame: -1,
          status: 'broken',
          score: 'x',
          lives: 'x',
          input: null,
          paddle: null,
          orb: null,
          panels: null,
        },
      },
    };

    runToy('not json', storageValue);

    expect(storageValue.current.SOLA1.width).toBe(360);
    expect(storageValue.current.SOLA1.height).toBe(240);
    expect(storageValue.current.SOLA1.status).toBe('ready');
    expect(storageValue.current.SOLA1.panels).toHaveLength(12);
  });

  it('rejects wrapped storage with an unexpected version', () => {
    const storageValue = { current: { SOLA1: { version: 999 } } };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.version).toBe(1);
    expect(storageValue.current.SOLA1.panels).toHaveLength(12);
  });

  it('normalizes panel state and keyboard input paths', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'ready',
          score: 0,
          lives: 3,
          input: {
            keyboard: null,
            gamepad: null,
            actions: null,
            edgeActions: null,
            previousActions: null,
          },
          paddle: null,
          orb: null,
          panels: [
            {
              id: 123,
              x: 'bad',
              y: 'bad',
              width: -1,
              height: 0,
              charge: 'bad',
            },
          ],
        },
      },
    };

    runToy(JSON.stringify({ type: 'keydown', key: 'ArrowLeft' }), storageValue);

    expect(storageValue.current.SOLA1.input.keyboard).toEqual({
      ArrowLeft: true,
    });
    expect(storageValue.current.SOLA1.panels[0].id).toBe('p1-1');
    expect(storageValue.current.SOLA1.panels[0].charge).toBe(false);
  });

  it('normalizes malformed gamepad and orb state', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'ready',
          score: 0,
          lives: 3,
          input: {
            keyboard: null,
            gamepad: { buttons: 'bad', axes: 'bad' },
            actions: null,
            edgeActions: null,
            previousActions: null,
          },
          paddle: null,
          orb: {
            x: 'bad',
            y: 'bad',
            vx: 'bad',
            vy: 'bad',
            radius: 'bad',
            stuckToPaddle: false,
          },
          panels: [],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.input.gamepad.buttons).toEqual([]);
    expect(storageValue.current.SOLA1.input.gamepad.axes).toEqual([]);
    expect(storageValue.current.SOLA1.orb.x).toBe(180);
    expect(storageValue.current.SOLA1.orb.y).toBe(0);
  });

  it('falls back to an empty keyboard snapshot when the persisted keyboard is null', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'ready',
          score: 0,
          lives: 3,
          input: {
            keyboard: null,
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 80, y: 70, vx: 0, vy: -3, radius: 4, stuckToPaddle: false },
          panels: [],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.input.keyboard).toEqual({});
  });
});

describe('solarPaddle input and orb normalization', () => {
  it('keeps the orb anchored when it is stuck to the paddle', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 80, y: 70, vx: 0, vy: 0, radius: 4, stuckToPaddle: true },
          panels: [],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.orb.y).toBeLessThan(114);
  });

  it('normalizes a persisted orb with missing numeric fields', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'ready',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: {
            x: null,
            y: null,
            vx: null,
            vy: null,
            radius: null,
            stuckToPaddle: false,
          },
          panels: [],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.orb.x).toBe(180);
    expect(storageValue.current.SOLA1.orb.y).toBe(0);
  });

  it('falls back to default panels when the persisted list is empty', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 0,
          status: 'ready',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 86, y: 160, vx: 1, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.panels).toHaveLength(12);
  });
});

describe('solarPaddle collision branches', () => {
  it('covers reset, wall, paddle, and panel-axis branches', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 1, y: 1, vx: -2, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: false },
            { id: 'p2', x: 64, y: 32, width: 24, height: 10, charge: true },
          ],
        },
      },
    };

    runToy(JSON.stringify({ type: 'keydown', key: 'r' }), storageValue);
    const next = runToy('{}', storageValue);

    expect(next.storageValue.current.SOLA1.status).toBe('ready');
    expect(next.storageValue.current.SOLA1.orb.stuckToPaddle).toBe(true);
  });
});

describe('solarPaddle additional collision branches', () => {
  it('covers the remaining solar collision branches without reset', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 86, y: 160, vx: 1, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: false },
            { id: 'p2', x: 64, y: 32, width: 24, height: 10, charge: false },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.orb.vy).toBeLessThan(0);
  });

  it('bounces the orb off the right wall and the paddle face', () => {
    const wallStorage = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 177, y: 80, vx: 3, vy: 0, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: true },
          ],
        },
      },
    };

    const paddleStorage = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 86, y: 120, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: true },
          ],
        },
      },
    };

    runToy('{}', wallStorage);
    runToy('{}', paddleStorage);

    expect(wallStorage.current.SOLA1.orb.vx).toBeLessThan(0);
    expect(paddleStorage.current.SOLA1.orb.vy).toBeLessThan(0);
  });

  it('bounces the orb off a panel instead of letting it pass through after separation', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 40, y: 44, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: false },
          ],
        },
      },
    };

    const { storageValue: nextStorage } = runToy('{}', storageValue);
    const nextState = nextStorage.current.SOLA1;

    expect(nextState.orb.y).not.toBe(34);
  });
});

describe('solarPaddle panel outcomes', () => {
  it('marks the scene won when every panel is charged', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 40, y: 44, vx: 0, vy: 0, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: true },
            { id: 'p2', x: 64, y: 32, width: 24, height: 10, charge: true },
          ],
        },
      },
    };

    const everySpy = jest
      .spyOn(Array.prototype, 'every')
      .mockImplementationOnce(() => true);

    try {
      runToy('{}', storageValue);
    } finally {
      everySpy.mockRestore();
    }

    expect(storageValue.current.SOLA1.status).toBe('won');
  });

  it('covers the horizontal panel collision and numeric fallback branches', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [true], axes: [0] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: -1, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 29, y: 37, vx: -3, vy: 1, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: false },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.paddle.x).toBe(128);
    expect(storageValue.current.SOLA1.orb.vx).toBeGreaterThan(0);
    expect(storageValue.current.SOLA1.panels[0].charge).toBe(true);
  });

  it('skips already-charged panels before hitting a fresh one', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 29, y: 37, vx: -3, vy: 1, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: true },
            { id: 'p2', x: 32, y: 32, width: 24, height: 10, charge: false },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.score).toBe(1);
    expect(storageValue.current.SOLA1.panels[0].charge).toBe(true);
    expect(storageValue.current.SOLA1.panels[1].charge).toBe(false);
  });

  it('snaps the paddle to whole pixels while moving', () => {
    const storageValue = { current: null };
    runToy(
      JSON.stringify({ type: 'keydown', key: 'ArrowRight' }),
      storageValue
    );
    const { storageValue: nextStorage } = runToy('{}', storageValue);

    expect(Number.isInteger(nextStorage.current.SOLA1.paddle.x)).toBe(true);
  });

  it('preserves a left-edge paddle position when state is rehydrated', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 0, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 80, y: 70, vx: 0, vy: -3, radius: 4, stuckToPaddle: false },
          panels: [],
        },
      },
    };

    const { storageValue: nextStorage } = runToy('{}', storageValue);

    expect(nextStorage.current.SOLA1.paddle.x).toBe(0);
  });
});

describe('solarPaddle life and relaunch behavior', () => {
  it('loses a life when the orb exits below the canvas', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 2,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 80, y: 150, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [],
        },
      },
    };

    const { storageValue: nextStorage } = runToy('{}', storageValue);

    expect(nextStorage.current.SOLA1.lives).toBe(1);
    expect(nextStorage.current.SOLA1.status).toBe('ready');
    expect(nextStorage.current.SOLA1.orb.stuckToPaddle).toBe(true);
  });

  it('can relaunch after a missed orb and life loss', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 2,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 80, y: 150, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [],
        },
      },
    };

    runToy('{}', storageValue);
    runToy(JSON.stringify({ type: 'keyup', key: 'Space' }), storageValue);
    const relaunched = runToy(
      JSON.stringify({ type: 'keydown', key: 'Space' }),
      storageValue
    );

    expect(relaunched.storageValue.current.SOLA1.status).toBe('running');
    expect(relaunched.storageValue.current.SOLA1.orb.stuckToPaddle).toBe(false);
  });

  it('resets cleanly from a paused state and can launch again', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: 'Space' }), storageValue);
    runToy(JSON.stringify({ type: 'keydown', key: 'P' }), storageValue);
    const reset = runToy(
      JSON.stringify({ type: 'keydown', key: 'R' }),
      storageValue
    );
    const resetState = structuredClone(reset.storageValue.current.SOLA1);
    runToy(JSON.stringify({ type: 'keyup', key: 'R' }), storageValue);
    const relaunched = runToy(
      JSON.stringify({ type: 'keydown', key: 'Space' }),
      storageValue
    );

    expect(resetState.status).toBe('ready');
    expect(resetState.orb.stuckToPaddle).toBe(true);
    expect(relaunched.storageValue.current.SOLA1.status).toBe('running');
    expect(relaunched.storageValue.current.SOLA1.orb.stuckToPaddle).toBe(false);
  });
});

describe('solarPaddle action and wall behavior', () => {
  it('derives actions from capture snapshots and gamepad button edits', () => {
    const storageValue = { current: null };
    runToy(JSON.stringify({ type: 'keydown', key: 'ArrowLeft' }), storageValue);
    runToy(JSON.stringify({ type: 'keyup', key: 'ArrowLeft' }), storageValue);
    const capture = runToy(
      JSON.stringify({ type: 'capture', capturing: false }),
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

    expect(capture.storageValue.current.SOLA1.input.actions.left).toBe(false);
    expect(snapshot.storageValue.current.SOLA1.input.gamepad.buttons).toEqual([
      true,
      true,
      false,
    ]);
    expect(snapshot.storageValue.current.SOLA1.input.gamepad.axes).toEqual([
      1, 0,
    ]);
  });

  it('bounces from both walls and the top edge', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 1, y: 1, vx: -2, vy: -3, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: false },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.orb.vx).toBeGreaterThan(0);
    expect(storageValue.current.SOLA1.orb.vy).toBeGreaterThan(0);
  });

  it('bounces from the paddle and resets the orb when falling below the board', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 2,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 86, y: 160, vx: 1, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: true },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.orb.vy).toBeLessThan(0);
    expect(storageValue.current.SOLA1.lives).toBe(1);
    expect(storageValue.current.SOLA1.orb.stuckToPaddle).toBe(true);
  });

  it('uses the default launch speed when paddle bounce would clamp to zero', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 86, y: 120, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.orb.vx).toBeGreaterThan(0);
  });
});

describe('solarPaddle panel reflection behavior', () => {
  it('reflects from the side of a panel', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 29, y: 37, vx: -3, vy: 1, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: false },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.orb.vx).toBeGreaterThan(0);
  });

  it('reflects from the center of a panel on the x axis', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 44, y: 44, vx: 0, vy: 1, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 42, y: 32, width: 4, height: 40, charge: false },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.orb.vx).toBeGreaterThan(0);
  });

  it('uses the default paddle bounce speed when the centered hit offset clamps to zero', () => {
    const state = {
      paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
      orb: { x: 86, y: 117, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
    };

    resolvePaddle(state);

    expect(state.orb.vx).toBe(1);
  });

  it('falls back to a positive x offset when the panel hit is centered on the x axis', () => {
    const orb = { x: 44, y: 44, vx: 0, vy: 1, radius: 4 };
    const panel = { x: 42, y: 32, width: 4, height: 40 };

    separateOrbFromPanel(orb, panel, 'x');

    expect(orb.x).toBeGreaterThan(panel.x + panel.width / 2);
  });

  it('reflects from the top of a panel', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 44, y: 36, vx: 0, vy: 3, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: false },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.orb.vy).toBeLessThan(0);
  });
});

describe('solarPaddle final outcome branches', () => {
  it('separates the orb on the horizontal paddle edge and charges a fresh panel', () => {
    const storageValue = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 40, y: 36, vx: 2, vy: 1, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 84, y: 32, width: 24, height: 10, charge: false },
          ],
        },
      },
    };

    runToy('{}', storageValue);

    expect(storageValue.current.SOLA1.score).toBe(1);
    expect(storageValue.current.SOLA1.panels[0].charge).toBe(true);
  });

  it('marks the scene won when every panel is charged and lost when lives are gone', () => {
    const winStorage = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 3,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: { x: 40, y: 34, vx: 0, vy: 1, radius: 4, stuckToPaddle: false },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: false },
          ],
        },
      },
    };

    runToy('{}', winStorage);
    expect(winStorage.current.SOLA1.status).toBe('running');

    const lostStorage = {
      current: {
        SOLA1: {
          version: 1,
          width: 180,
          height: 140,
          frame: 3,
          status: 'running',
          score: 0,
          lives: 1,
          input: {
            keyboard: {},
            gamepad: { buttons: [], axes: [] },
            actions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
            edgeActions: {
              left: false,
              right: false,
              launchPressed: false,
              pausePressed: false,
              resetPressed: false,
            },
            previousActions: {
              left: false,
              right: false,
              launch: false,
              pause: false,
              reset: false,
            },
          },
          paddle: { x: 60, y: 114, width: 52, height: 7, speed: 4 },
          orb: {
            x: 86,
            y: 150,
            vx: 0,
            vy: 10,
            radius: 4,
            stuckToPaddle: false,
          },
          panels: [
            { id: 'p1', x: 32, y: 32, width: 24, height: 10, charge: false },
          ],
        },
      },
    };

    runToy('{}', lostStorage);
    expect(lostStorage.current.SOLA1.status).toBe('lost');
  });
});
