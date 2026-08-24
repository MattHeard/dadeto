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
    expect(h.parseInput('   ')).toBeNull();
    expect(h.parseInput(null)).toBeNull();
    expect(h.parseInput({})).toBeNull();
    expect(h.parseInput('null')).toBeNull();
    expect(h.parseInput('{"width":240}')).toEqual({ width: 240 });
    expect(h.parseObjectRecord('[]')).toBeNull();
    expect(h.parseObjectRecord('{"ready":true}')).toEqual({ ready: true });
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
    expect(h.updateInputState(undefined, {})).toMatchObject({
      keyboard: {},
      gamepad: { buttons: [], axes: [] },
      actions: { left: false, right: false, launch: false, pause: false, reset: false },
    });
    const seedOptions = h.createSeedOptions();
    expect(h.createState(seedOptions)).toMatchObject({ version: 1, width: 360, height: 240, frame: 0, status: 'ready', lives: 3, paddle: { width: 52, height: 7 }, orb: { radius: 4, stuckToPaddle: true } });
    expect(h.normalizeState({ version: 0 })).toBeNull();
    expect(h.normalizeState('bad')).toBeNull();
    expect(h.normalizeBooleanRecord('bad')).toEqual({});
    expect(h.normalizeGamepadState('bad')).toEqual({ buttons: [], axes: [] });
    expect(h.normalizeActions([])).toEqual({ left: false, right: false, launch: false, pause: false, reset: false });
    expect(h.normalizeEdgeActions([])).toEqual({ left: false, right: false, launchPressed: false, pausePressed: false, resetPressed: false });
    expect(h.normalizePaddle([], 200)).toMatchObject({ width: 52, height: 7 });
    expect(h.normalizeOrb([])).toMatchObject({ radius: 4, stuckToPaddle: true });
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
    expect(h.isAxisLeft(-0.25)).toBe(false);
    expect(h.isAxisRight(0.25)).toBe(false);
    expect(h.isAxisLeft(-0.401)).toBe(true);
    expect(h.isAxisRight(0.401)).toBe(true);

    const state = h.createState(h.createSeedOptions());
    state.status = 'ready';
    h.applyGameplayInput(state, { actions: { left: false, right: false, launch: true, pause: false, reset: false }, edgeActions: { left: false, right: false, launchPressed: true, pausePressed: false, resetPressed: false } });
    expect(state.status).toBe('running');
    expect(state.orb.stuckToPaddle).toBe(false);
    state.status = 'running';
    h.applyGameplayInput(state, { actions: { left: false, right: false, launch: false, pause: true, reset: false }, edgeActions: { left: false, right: false, launchPressed: false, pausePressed: true, resetPressed: false } });
    expect(state.status).toBe('paused');
    h.movePaddle(state, { left: true, right: false });
    expect(state.paddle.x).toBeGreaterThanOrEqual(0);
    state.paddle.x = 100;
    h.movePaddle(state, { left: false, right: true });
    expect(state.paddle.x).toBe(104);
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
    expect(h.isAxisLeft(-0.4)).toBe(false);
    expect(h.isAxisLeft(-0.41)).toBe(true);
    expect(h.isAxisRight(0.4)).toBe(false);
    expect(h.isAxisRight(0.41)).toBe(true);
    expect(h.normalizePanelFromState({ id: 4, x: 0, y: 0, width: -1, height: 0, charge: 1 }, 2))
      .toEqual({ id: 'p3', x: 0, y: 0, width: 20, height: 10, charge: false });
    expect(h.normalizePaddle({ x: -1, y: -1, width: -1, height: 0, speed: -1 }, 4))
      .toEqual({ x: 180, y: 0, width: 52, height: 7, speed: 4 });
    expect(h.normalizeOrb({ x: 0, y: 0, vx: 0, vy: 0, radius: 0, stuckToPaddle: false }))
      .toEqual({ x: 180, y: 0, vx: 1, vy: -2, radius: 4, stuckToPaddle: false });
    expect(h.normalizePanelsFromState([false, 1, 'panel', { x: 1, y: 2 }])).toHaveLength(1);
    for (const invalid of [undefined, null, 0, '', [], {}, 'READY', 'running ']) {
      expect(h.normalizeStatus(invalid)).toBe('ready');
    }
    expect(h.normalizeGamepadState({ buttons: [true, false, 1], axes: [0, -1, 'bad'] }))
      .toEqual({ buttons: [true, false, false], axes: [0, -1, 0] });
    expect(h.normalizeGamepadState({ buttons: {}, axes: {} })).toEqual({ buttons: [], axes: [] });
    expect(h.normalizeActions({ left: 1, right: 'true', launch: null, pause: {}, reset: [] }))
      .toEqual({ left: false, right: false, launch: false, pause: false, reset: false });
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

  it('locks panel normalization and score-bar rendering boundaries', () => {
    const normalized = h.normalizePanelsFromState([
      { id: 'charged', x: 2, y: 3, width: 30, height: 11, charge: true },
      null,
      { x: 4, y: 5, charge: false },
    ]);
    expect(normalized).toHaveLength(2);
    expect(normalized[0]).toEqual({ id: 'charged', x: 2, y: 3, width: 30, height: 11, charge: true });
    expect(normalized[1]).toEqual({ id: 'p2', x: 4, y: 5, width: 20, height: 10, charge: false });
    const state = h.createState(h.createSeedOptions());
    state.panels = normalized;
    state.score = 0;
    let payload = h.toCanvasPayload(state);
    expect(payload.shapes.filter(shape => shape.type === 'rect')).toHaveLength(6);
    expect(payload.shapes[2].fill).toBe('#1d4ed8');
    expect(payload.shapes[3].fill).toBe('#7dd3fc');
    expect(payload.shapes.at(-1).width).toBe(20);
    state.score = 100;
    payload = h.toCanvasPayload(state);
    expect(payload.shapes.at(-1).width).toBe(state.width - 36);
    state.status = 'lost';
    expect(payload.shapes.find(shape => shape.type === 'circle').fill).toBe('#fbbf24');
    expect(h.toCanvasPayload(state).shapes.find(shape => shape.type === 'circle').fill).toBe('#f87171');
  });

  it('locks deterministic panel coordinates and seeded ordering', () => {
    const positions = h.buildPanelPositions(240, 160, 28, 10);
    expect(positions).toHaveLength(15);
    expect(positions[0]).toEqual({ x: 28, y: 30 });
    expect(positions[1]).toEqual({ x: 54, y: 32 });
    expect(positions[2]).toEqual({ x: 91, y: 32 });
    expect(positions).toEqual([
      { x: 28, y: 30 }, { x: 54, y: 32 }, { x: 91, y: 32 }, { x: 140, y: 30 }, { x: 173, y: 32 },
      { x: 40, y: 46 }, { x: 66, y: 48 }, { x: 103, y: 48 }, { x: 152, y: 46 }, { x: 184, y: 48 },
      { x: 28, y: 62 }, { x: 46, y: 64 }, { x: 83, y: 64 }, { x: 132, y: 62 }, { x: 165, y: 64 },
    ]);
    const widePositions = h.buildPanelPositions(400, 200, 28, 10);
    expect(widePositions.slice(0, 5)).toEqual([
      { x: 28, y: 30 }, { x: 86, y: 32 }, { x: 152, y: 32 }, { x: 230, y: 30 }, { x: 288, y: 32 },
    ]);
    const narrowPositions = h.buildPanelPositions(120, 160, 28, 10);
    expect(narrowPositions.slice(0, 3)).toEqual([
      { x: 28, y: 30 }, { x: 54, y: 32 }, { x: 64, y: 32 },
    ]);
    const mediumPositions = h.buildPanelPositions(180, 160, 28, 10);
    expect(mediumPositions.slice(0, 5)).toEqual([
      { x: 28, y: 30 }, { x: 54, y: 32 }, { x: 68, y: 32 }, { x: 107, y: 30 }, { x: 124, y: 32 },
    ]);
    expect(positions.every(position => position.x >= 28 && position.y >= 30)).toBe(true);
    const source = positions.slice(0, 5);
    expect(h.shufflePositions(source, 7)).toEqual(h.shufflePositions(source, 7));
    expect(h.shufflePositions(source, 7)).not.toEqual(source);
    expect(h.shufflePositions([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 5 }], 7))
      .toEqual([{ x: 1, y: 1 }, { x: 3, y: 3 }, { x: 5, y: 5 }, { x: 2, y: 2 }, { x: 4, y: 4 }]);
    expect(h.shufflePositions([], 7)).toEqual([]);
    expect(h.shufflePositions([{ x: 1, y: 1 }], 7)).toEqual([{ x: 1, y: 1 }]);
    expect(h.normalizePanels(240, 160, 7)).toEqual([
      { id: 'p1-1', x: 152, y: 46, width: 28, height: 10, charge: false },
      { id: 'p1-2', x: 173, y: 32, width: 28, height: 10, charge: false },
      { id: 'p1-3', x: 91, y: 32, width: 28, height: 10, charge: false },
      { id: 'p2-1', x: 165, y: 64, width: 28, height: 10, charge: false },
      { id: 'p2-2', x: 83, y: 64, width: 28, height: 10, charge: false },
      { id: 'p2-3', x: 54, y: 32, width: 28, height: 10, charge: false },
      { id: 'p2-4', x: 28, y: 30, width: 28, height: 10, charge: false },
      { id: 'p2-5', x: 132, y: 62, width: 28, height: 10, charge: false },
      { id: 'p3-1', x: 66, y: 48, width: 28, height: 10, charge: false },
      { id: 'p3-2', x: 184, y: 48, width: 28, height: 10, charge: false },
      { id: 'p3-3', x: 40, y: 46, width: 28, height: 10, charge: false },
      { id: 'p3-4', x: 103, y: 48, width: 28, height: 10, charge: false },
    ]);
  });

  it('covers physics edge branches and panel-hit ordering', () => {
    const state = h.createState(h.createSeedOptions());
    state.orb.stuckToPaddle = false;
    state.orb.x = state.width - 1; state.orb.y = 1; state.orb.vx = 2; state.orb.vy = -2;
    h.resolveWalls(state);
    expect(state.orb.x).toBe(state.width - state.orb.radius);
    expect(state.orb.vx).toBe(-2);
    expect(state.orb.y).toBe(state.orb.radius);
    expect(state.orb.vy).toBe(2);
    state.paddle.x = 0;
    h.movePaddle(state, { left: true, right: false });
    expect(state.paddle.x).toBe(0);
    state.paddle.x = state.width - state.paddle.width;
    h.movePaddle(state, { left: false, right: true });
    expect(state.paddle.x).toBe(state.width - state.paddle.width);
    state.panels = [
      { id: 'charged', x: 0, y: 0, width: 20, height: 10, charge: true },
      { id: 'live', x: 30, y: 0, width: 20, height: 10, charge: false },
    ];
    state.orb = { x: 35, y: 5, vx: 1, vy: -1, radius: 3, stuckToPaddle: false };
    state.score = 0;
    h.resolvePanels(state);
    expect(state.panels[0].charge).toBe(true);
    expect(state.panels[1].charge).toBe(true);
    expect(state.score).toBe(1);
    state.panels = [{ id: 'only', x: 0, y: 0, width: 20, height: 10, charge: true }];
    state.lives = 0; state.status = 'running';
    h.resolveWinLoss(state);
    expect(state.status).toBe('lost');
  });

  it('covers input persistence, release, and reset transitions', () => {
    const initial = h.createInitialInputState();
    const held = h.updateInputState(initial, { type: 'keydown', key: 'ArrowLeft' });
    expect(held.keyboard).toEqual({ ArrowLeft: true });
    expect(held.actions.left).toBe(true);
    expect(held.edgeActions.left).toBe(true);
    const released = h.updateInputState(held, { type: 'keyup', key: 'ArrowLeft' });
    expect(released.keyboard).toEqual({ ArrowLeft: false });
    expect(released.actions.left).toBe(false);
    expect(released.edgeActions.left).toBe(false);
    const button = h.updateInputState(initial, { buttons: [true], buttonIndex: 0, pressed: true });
    expect(button.gamepad.buttons[0]).toBe(true);
    const releasedButton = h.updateInputState(button, { buttonIndex: 0, pressed: false });
    expect(releasedButton.gamepad.buttons[0]).toBe(false);
    expect(button.edgeActions.launchPressed).toBe(true);
    const axes = h.updateInputState(initial, { axes: [-1] });
    expect(axes.gamepad.axes).toEqual([-1]);
    expect(axes.actions.left).toBe(true);
    const seed = h.createSeedState({ width: 200, height: 140 }, null);
    const advanced = h.buildNextState(seed, {});
    expect(advanced.frame).toBe(1);
    const reset = h.buildNextState(seed, { type: 'keydown', key: 'r' });
    expect(reset.frame).toBe(0);
    expect(reset.status).toBe('ready');
    expect(reset.panels).toEqual(seed.panels);
    const explicitReset = h.buildNextState(seed, { reset: true });
    expect(explicitReset.frame).toBe(1);
    expect(explicitReset.status).toBe('ready');
    const repeated = h.updateInputState(held, { type: 'keydown', key: 'ArrowLeft' });
    expect(repeated.actions.left).toBe(true);
    expect(repeated.edgeActions.left).toBe(false);
    expect(repeated.previousActions.left).toBe(true);
  });

  it('distinguishes paddle and panel collision conditions', () => {
    const state = h.createState(h.createSeedOptions());
    state.orb = { x: -20, y: state.paddle.y, vx: 1, vy: 2, radius: 3, stuckToPaddle: false };
    resolvePaddle(state);
    expect(state.orb.vy).toBe(2);
    state.orb.x = state.paddle.x + state.paddle.width / 2;
    state.orb.y = state.paddle.y - 20;
    resolvePaddle(state);
    expect(state.orb.vy).toBe(2);
    state.orb.y = state.paddle.y - 1;
    state.orb.vy = -2;
    resolvePaddle(state);
    expect(state.orb.vy).toBe(-2);
    state.orb.x = state.paddle.x + state.paddle.width / 2;
    state.orb.y = state.paddle.y - state.orb.radius + 1;
    state.orb.vy = 0;
    resolvePaddle(state);
    expect(state.orb.vy).toBe(0);
    state.orb.y = state.paddle.y - state.orb.radius - 0.1;
    state.orb.vy = 2;
    resolvePaddle(state);
    expect(state.orb.vy).toBe(2);
    state.orb.y = state.paddle.y + state.paddle.height + 6 - state.orb.radius + 0.1;
    resolvePaddle(state);
    expect(state.orb.vy).toBe(2);
    state.orb.y = state.paddle.y - state.orb.radius;
    resolvePaddle(state);
    expect(state.orb.y).toBe(state.paddle.y - state.orb.radius - 1);
    state.orb.y = state.paddle.y + state.paddle.height + 6 - state.orb.radius;
    state.orb.vy = 2;
    resolvePaddle(state);
    expect(state.orb.y).toBe(state.paddle.y - state.orb.radius - 1);
    state.orb.vy = 2;
    state.orb.y = state.paddle.y - 1;
    state.orb.x = state.paddle.x;
    resolvePaddle(state);
    expect(state.orb.vy).toBeLessThan(0);
    expect(state.orb.vx).toBe(-1);
    state.orb.x = state.paddle.x + state.paddle.width / 2;
    state.orb.y = state.paddle.y - 1;
    state.orb.vy = 2;
    state.orb.vx = 0;
    resolvePaddle(state);
    expect(state.orb.vx).toBe(1);
    state.orb.x = state.paddle.x + state.paddle.width;
    state.orb.y = state.paddle.y - 1;
    state.orb.vy = 2;
    state.orb.vx = 0;
    resolvePaddle(state);
    expect(state.orb.vx).toBe(2);
    expect(h.getPanelCollisionAxis({ x: -3, y: 5, radius: 3 }, { x: 0, y: 0, width: 20, height: 10 })).toBe('x');
    expect(h.getPanelCollisionAxis({ x: 10, y: -3, radius: 3 }, { x: 0, y: 0, width: 20, height: 10 })).toBe('y');
    expect(h.getPanelCollisionAxis({ x: 15, y: 5, radius: 3 }, { x: 0, y: 0, width: 20, height: 10 })).toBe('y');
    const orb = { x: 10, y: 5, vx: 1, vy: 1, radius: 2, stuckToPaddle: false };
    const panel = { x: 0, y: 0, width: 20, height: 10 };
    separateOrbFromPanel(orb, panel, 'x');
    expect(orb.x).toBe(22.5);
    separateOrbFromPanel(orb, panel, 'y');
    expect(orb.y).toBe(12.5);
  });

  it('covers persisted-state status and shape validation', () => {
    for (const status of ['ready', 'running', 'paused', 'won', 'lost']) {
      expect(h.normalizeStatus(status)).toBe(status);
    }
    expect(h.normalizeState(null)).toBeNull();
    expect(h.normalizeState([])).toBeNull();
    expect(h.normalizeState({ version: 2 })).toBeNull();
    const normalized = h.normalizeState({
      version: 1, width: -1, height: 0, frame: -1, status: 'paused', score: 2,
      lives: 1, input: {}, paddle: {}, orb: {}, panels: [],
    });
    expect(normalized).toMatchObject({ version: 1, status: 'paused', score: 2, lives: 1 });
    expect(normalized.width).toBe(360);
    expect(normalized.height).toBe(240);
    expect(normalized.frame).toBe(0);
    expect(normalized.input.actions.left).toBe(false);
    expect(normalized.paddle.width).toBe(52);
    expect(normalized.orb.radius).toBe(4);
    expect(h.readPersistedState(() => ({ SOLA1: null }))).toBeNull();
    expect(h.readPersistedState(() => null)).toBeNull();
  });

  it('covers custom seed dimensions and motion parameters', () => {
    const seed = h.createSeedState({
      width: 240, height: 180, paddleWidth: 64, paddleHeight: 9,
      paddleSpeed: 6, orbRadius: 6, orbSpeedX: 3, orbSpeedY: -4,
      layoutSeed: 5, lives: 5,
    }, null);
    expect(seed.width).toBe(240);
    expect(seed.height).toBe(180);
    expect(seed.lives).toBe(5);
    expect(seed.paddle).toMatchObject({ width: 64, height: 9, speed: 6 });
    expect(seed.orb).toMatchObject({ radius: 6, vx: 3, vy: -4, stuckToPaddle: true });
    expect(seed.panels).toHaveLength(12);
    const values = h.normalizeSeedValues({ paddleWidth: 70, paddleHeight: 8, paddleSpeed: 7, orbRadius: 5, orbSpeedX: 2, orbSpeedY: -3 }, null, h.createSeedDefaults());
    expect(values).toMatchObject({ paddleWidth: 70, paddleHeight: 8, paddleSpeed: 7, orbRadius: 5, orbSpeedX: 2, orbSpeedY: -3 });
    expect(h.normalizeSeedValues({}, null, h.createSeedDefaults())).toMatchObject({ paddleWidth: 52, paddleHeight: 7, paddleSpeed: 4, orbRadius: 4, orbSpeedX: 1, orbSpeedY: -2 });
  });

  it('locks reset seed increments and exact state geometry', () => {
    const resetFromThree = h.createResetSeedState({}, { layoutSeed: 3, width: 200, height: 140, lives: 2 });
    const resetFromFour = h.createSeedState({ layoutSeed: 4, width: 200, height: 140, lives: 2 }, null);
    expect(resetFromThree.panels).toEqual(resetFromFour.panels);
    const state = h.createState({ width: 241, height: 20, paddleWidth: 52, paddleHeight: 7, paddleSpeed: 4, orbRadius: 4, orbSpeedX: 1, orbSpeedY: -2, lives: 3, panels: [] });
    expect(state.paddle.x).toBe(95);
    expect(state.paddle.y).toBe(0);
    expect(state.orb.x).toBe(121);
    expect(state.orb.y).toBe(-5);
    expect(state.orb.stuckToPaddle).toBe(true);
  });

  it('distinguishes parser and storage accessor input forms', () => {
    expect(h.parseObjectRecord('true')).toBeNull();
    expect(h.parseObjectRecord('false')).toBeNull();
    expect(h.parseObjectRecord('"text"')).toBeNull();
    expect(h.parseObjectRecord('null')).toBeNull();
    expect(h.parseObjectRecord('[1,2]')).toBeNull();
    expect(h.parseObjectRecord('{"nested":{"ok":true}}')).toEqual({ nested: { ok: true } });
    const setter = () => {};
    expect(h.getStorageAccessor(new Map([['setLocalPermanentData', setter]]))).toBe(setter);
    expect(h.getStorageAccessor(new Map([['setLocalPermanentData', null]]))).toBeNull();
    expect(h.getStorageAccessor({ get: 'not a function' })).toBeNull();
    expect(h.parseInput(42)).toBeNull();
    expect(h.parseInput('  ')).toBeNull();
  });

  it('covers no-op input events and exact edge-action projection', () => {
    const keyboard = { held: true };
    h.applyKeyboardInput(null, keyboard);
    h.applyKeyboardInput({ type: 'keydown', key: 4 }, keyboard);
    h.applyKeyboardInput({ type: 'keyup' }, keyboard);
    expect(keyboard).toEqual({ held: true });
    const gamepad = { buttons: [true], axes: [1] };
    h.applyGamepadInput(null, gamepad);
    h.applyGamepadInput({ buttons: 'bad', axes: 'bad', buttonIndex: '0' }, gamepad);
    expect(gamepad).toEqual({ buttons: [true], axes: [1] });
    const all = { left: true, right: true, launch: true, pause: true, reset: true };
    const none = { left: false, right: false, launch: false, pause: false, reset: false };
    expect(h.createEdgeActions(all, none)).toEqual({ left: true, right: true, launchPressed: true, pausePressed: true, resetPressed: true });
    expect(h.createEdgeActions(all, all)).toEqual({ left: false, right: false, launchPressed: false, pausePressed: false, resetPressed: false });
    const result = h.createActionsFromState({ ArrowLeft: true }, { buttons: [], axes: [] });
    expect(result.edgeActions).toEqual({ left: true, right: false, launchPressed: false, pausePressed: false, resetPressed: false });
  });

  it('covers gameplay status transitions and stuck-orb behavior', () => {
    const state = h.createState(h.createSeedOptions());
    const noInput = { actions: { left: false, right: false, launch: false, pause: false, reset: false }, edgeActions: { left: false, right: false, launchPressed: false, pausePressed: false, resetPressed: false } };
    h.applyGameplayInput(state, noInput);
    expect(state.status).toBe('ready');
    expect(state.orb.x).toBe(state.paddle.x + Math.round(state.paddle.width / 2));
    state.orb.x = 0;
    state.orb.y = 0;
    h.applyGameplayInput(state, noInput);
    expect(state.orb.x).toBe(state.paddle.x + Math.round(state.paddle.width / 2));
    expect(state.orb.y).toBe(state.paddle.y - state.orb.radius - 1);
    state.status = 'running';
    state.orb.stuckToPaddle = false;
    const before = { x: state.orb.x, y: state.orb.y };
    h.stepSimulation(state);
    expect(state.orb.x).not.toBe(before.x);
    expect(state.orb.y).not.toBe(before.y);
    state.panels = [];
    state.orb = { x: 10, y: 20, vx: 2, vy: 3, radius: 2, stuckToPaddle: false };
    h.stepSimulation(state);
    expect(state.orb).toMatchObject({ x: 12, y: 23 });
    state.orb.stuckToPaddle = true;
    const stuck = { x: state.orb.x, y: state.orb.y };
    h.stepSimulation(state);
    expect(state.orb).toMatchObject(stuck);
    state.status = 'paused';
    h.applyGameplayInput(state, { actions: noInput.actions, edgeActions: { ...noInput.edgeActions, pausePressed: true } });
    expect(state.status).toBe('running');
    state.status = 'running';
    h.applyGameplayInput(state, { actions: noInput.actions, edgeActions: { ...noInput.edgeActions, pausePressed: true } });
    expect(state.status).toBe('paused');
    state.status = 'ready';
    h.applyGameplayInput(state, { actions: noInput.actions, edgeActions: { ...noInput.edgeActions, pausePressed: true } });
    expect(state.status).toBe('ready');
    state.status = 'running';
    state.orb.stuckToPaddle = true;
    h.applyGameplayInput(state, { actions: noInput.actions, edgeActions: { ...noInput.edgeActions, launchPressed: true } });
    expect(state.status).toBe('running');
    expect(state.orb.stuckToPaddle).toBe(true);
    state.status = 'paused';
    h.applyGameplayInput(state, noInput);
    expect(state.status).toBe('paused');
  });

  it('locks exact canvas payload geometry and rounding', () => {
    const state = h.createState({ width: 100, height: 80, paddleWidth: 20, paddleHeight: 5, paddleSpeed: 3, orbRadius: 3, orbSpeedX: 1, orbSpeedY: -1, lives: 2, panels: [{ id: 'p', x: 8, y: 12, width: 16, height: 6, charge: false }] });
    state.paddle.x = 21;
    state.paddle.y = 60;
    state.orb.x = 20.6;
    state.orb.y = 30.4;
    state.score = 3;
    const payload = h.toCanvasPayload(state);
    expect(payload).toEqual({
      width: 100,
      height: 80,
      shapes: [
        { type: 'rect', x: 0, y: 0, width: 100, height: 80, fill: '#0b1220' },
        { type: 'rect', x: 14, y: 14, width: 72, height: 52, fill: '#10233f' },
        { type: 'rect', x: 8, y: 12, width: 16, height: 6, fill: '#7dd3fc' },
        { type: 'rect', x: 21, y: 60, width: 20, height: 5, fill: '#cbd5e1' },
        { type: 'circle', x: 21, y: 30, radius: 3, fill: '#fbbf24' },
        { type: 'rect', x: 18, y: 68, width: 50, height: 4, fill: '#34d399' },
      ],
    });
  });

  it('covers panel clamps and circle/bottom boundary inclusivity', () => {
    const small = h.buildPanelPositions(80, 80, 28, 10);
    expect(small).toHaveLength(15);
    expect(new Set(small.map(position => `${position.x},${position.y}`))).toEqual(new Set(['24,10']));
    expect(h.circleIntersectsPanel({ x: -2, y: 5, radius: 2 }, { x: 0, y: 0, width: 10, height: 10 })).toBe(true);
    expect(h.circleIntersectsPanel({ x: -3, y: 5, radius: 2 }, { x: 0, y: 0, width: 10, height: 10 })).toBe(false);
    expect(h.circleIntersectsPanel({ x: -1, y: -1, radius: Math.sqrt(2) }, { x: 0, y: 0, width: 10, height: 10 })).toBe(true);
    expect(h.circleIntersectsPanel({ x: -1, y: -1, radius: 1.4 }, { x: 0, y: 0, width: 10, height: 10 })).toBe(false);
    const state = h.createState(h.createSeedOptions());
    state.orb.y = state.height - state.orb.radius;
    state.lives = 2;
    h.resolveBottom(state);
    expect(state.lives).toBe(2);
    state.orb.y = state.height - state.orb.radius + 0.1;
    h.resolveBottom(state);
    expect(state.lives).toBe(1);
    state.orb.x = state.width - 1;
    state.orb.vx = 3;
    h.resolveWalls(state);
    expect(state.orb.vx).toBe(-3);
    state.orb.x = 1;
    state.orb.vx = 3;
    h.resolveWalls(state);
    expect(state.orb.vx).toBe(3);
    state.orb.x = state.orb.radius;
    state.orb.vx = -3;
    h.resolveWalls(state);
    expect(state.orb.vx).toBe(3);
    state.orb.x = state.width - state.orb.radius;
    state.orb.vx = 3;
    h.resolveWalls(state);
    expect(state.orb.vx).toBe(-3);
    state.orb.y = state.orb.radius;
    state.orb.vy = -3;
    h.resolveWalls(state);
    expect(state.orb.vy).toBe(3);
    const edgePaddle = h.createState(h.createSeedOptions());
    edgePaddle.orb.x = edgePaddle.paddle.x - edgePaddle.orb.radius;
    edgePaddle.orb.y = edgePaddle.paddle.y - edgePaddle.orb.radius + 1;
    edgePaddle.orb.vy = 2;
    resolvePaddle(edgePaddle);
    expect(edgePaddle.orb.vy).toBeLessThan(0);
    edgePaddle.orb.x = edgePaddle.paddle.x + edgePaddle.paddle.width + edgePaddle.orb.radius;
    edgePaddle.orb.y = edgePaddle.paddle.y + edgePaddle.paddle.height + 6 - edgePaddle.orb.radius;
    edgePaddle.orb.vy = 2;
    resolvePaddle(edgePaddle);
    expect(edgePaddle.orb.vy).toBeLessThan(0);
    edgePaddle.orb.x = edgePaddle.paddle.x + edgePaddle.paddle.width / 2;
    edgePaddle.orb.y = edgePaddle.paddle.y - edgePaddle.orb.radius;
    edgePaddle.orb.vy = 2;
    resolvePaddle(edgePaddle);
    expect(edgePaddle.orb.vy).toBe(-2);
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

  it('separates panel hits toward the side they came from', () => {
    const panel = { x: 42, y: 32, width: 4, height: 40 };
    const leftOrb = { x: 40, y: 44, vx: 0, vy: 1, radius: 4 };
    const rightOrb = { x: 48, y: 44, vx: 0, vy: 1, radius: 4 };
    const topOrb = { x: 44, y: 28, vx: 0, vy: 1, radius: 4 };
    const bottomOrb = { x: 44, y: 80, vx: 0, vy: 1, radius: 4 };

    separateOrbFromPanel(leftOrb, panel, 'x');
    separateOrbFromPanel(rightOrb, panel, 'x');
    separateOrbFromPanel(topOrb, panel, 'y');
    separateOrbFromPanel(bottomOrb, panel, 'y');

    expect(leftOrb.x).toBe(panel.x - leftOrb.radius - 0.5);
    expect(rightOrb.x).toBe(panel.x + panel.width + rightOrb.radius + 0.5);
    expect(topOrb.y).toBe(panel.y - topOrb.radius - 0.5);
    expect(bottomOrb.y).toBe(panel.y + panel.height + bottomOrb.radius + 0.5);
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
