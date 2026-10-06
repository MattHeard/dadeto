import { describe, expect, it, jest } from '@jest/globals';
import {
  advectVelocityField,
  createFluidState,
  stepFluid,
} from '../../../../src/core/browser/game/chronoflow/chronoflow.js';
import {
  advanceChronoflow,
  createChronoflowGame,
  finalizeChronoflowObjective,
  openSluice,
  resetChronoflow,
  setChronoflowRoute,
  startTimedRun,
  toggleChronoflowChannel,
} from '../../../../src/core/browser/game/chronoflow/runtime.js';
import { startChronoflowPage } from '../../../../src/core/browser/game/chronoflow/pagePresenter.js';

/**
 * Sum the water in a fluid grid.
 * @param {import('../../../../src/core/browser/game/chronoflow/chronoflow.js').FluidState} state Fluid grid.
 * @returns {number} Total water volume.
 */
function totalVolume(state) {
  return state.volume.reduce((total, amount) => total + amount, 0);
}

class FakeElement {
  constructor() {
    this.listeners = new Map();
    this.dataset = {};
    this.style = { setProperty: () => {} };
    this.children = [];
    this.textContent = '';
    this.disabled = false;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }

  emit(type) {
    this.listeners.get(type)?.();
  }

  replaceChildren(...children) {
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes ??= {};
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes?.[name] ?? null;
  }
}

describe('Chronoflow deterministic fluid core', () => {
  it('advects a uniform velocity field without changing its value', () => {
    const result = advectVelocityField({
      width: 4,
      height: 2,
      velocityX: Array(8).fill(0.5),
      velocityY: Array(8).fill(-0.25),
      solids: Array(8).fill(false),
      dt: 0.1,
    });
    expect(result.velocityX).toEqual(Array(8).fill(0.5));
    expect(result.velocityY).toEqual(Array(8).fill(-0.25));
  });

  it('transports a localized velocity pattern in its travel direction', () => {
    const result = advectVelocityField({
      width: 5,
      height: 1,
      velocityX: Array(5).fill(0.5),
      velocityY: [0, 1, 0, 0, 0],
      solids: Array(5).fill(false),
      dt: 0.1,
    });
    expect(result.velocityY[1]).toBeGreaterThan(result.velocityY[2]);
    expect(result.velocityY[2]).toBeGreaterThan(0);
    expect(result.velocityY.every(Number.isFinite)).toBe(true);
    expect(result.velocityY.every(value => Math.abs(value) <= 1)).toBe(true);
  });

  it('never samples velocity from a solid cell', () => {
    const result = advectVelocityField({
      width: 3,
      height: 1,
      velocityX: [0, -1, 1],
      velocityY: [0, 1, 0],
      solids: [false, true, false],
      dt: 0.1,
    });
    expect(result.velocityX[1]).toBe(0);
    expect(result.velocityY[1]).toBe(0);
    expect(result.velocityX[2]).toBe(1);
    expect(result.velocityY[2]).toBe(0);
  });

  it('creates independent bounded cell, velocity, and solid arrays', () => {
    const inputVolume = [0.5, 0.25];
    const state = createFluidState({
      width: 2,
      height: 1,
      volume: inputVolume,
    });

    expect(state).toMatchObject({
      width: 2,
      height: 1,
      tick: 0,
      viscosity: 0.08,
      volume: [0.5, 0.25],
      velocityX: [0, 0],
      velocityY: [0, 0],
      solids: [false, false],
    });
    expect(state.volume).not.toBe(inputVolume);
  });

  it('applies a fixed step repeatably and conserves a closed grid', () => {
    const initial = createFluidState({
      width: 3,
      height: 2,
      volume: [0.8, 0.1, 0, 0, 0, 0],
    });

    const first = stepFluid(initial);
    const replay = stepFluid(
      createFluidState({
        width: 3,
        height: 2,
        volume: [0.8, 0.1, 0, 0, 0, 0],
      })
    );

    expect(first.state).toEqual(replay.state);
    expect(first.state.tick).toBe(1);
    expect(totalVolume(first.state)).toBeCloseTo(totalVolume(initial), 12);
    expect(first.state.volume.every(value => value >= 0 && value <= 1)).toBe(
      true
    );
    expect(first.state.volume[3]).toBeGreaterThan(0);
  });

  it('routes no water through solid cells and skips blocked faces', () => {
    const state = createFluidState({
      width: 3,
      height: 1,
      volume: [1, 0, 0],
      solids: [false, true, false],
    });

    const result = stepFluid(state);

    expect(result.state.volume).toEqual([1, 0, 0]);
    expect(totalVolume(result.state)).toBe(1);
    const blockedVertical = createFluidState({
      width: 1,
      height: 2,
      volume: [1, 0],
      solids: [false, true],
    });
    expect(stepFluid(blockedVertical).state.volume).toEqual([1, 0]);
  });

  it('projects a 2D velocity field toward lower discrete divergence', () => {
    const state = createFluidState({
      width: 3,
      height: 3,
      volume: Array(9).fill(0.5),
      velocityX: [0, 0, 0, 0, 1, 0, 0, 0, 0],
      velocityY: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    });
    const projected = stepFluid(state).state;
    const divergence = fluidDivergence(projected);
    expect(rmsDivergence(projected)).toBeLessThan(rmsDivergence(state));
    expect(divergence.every(Number.isFinite)).toBe(true);
    expect(projected.velocityX.every(value => Math.abs(value) <= 1)).toBe(true);
    expect(projected.velocityY.every(value => Math.abs(value) <= 1)).toBe(true);
    expect(totalVolume(projected)).toBeCloseTo(totalVolume(state), 12);
    expect(stepFluid(state).state).toEqual(projected);
  });

  it('projects a deterministic 32x20 field with at least 80% divergence reduction', () => {
    const width = 32;
    const height = 20;
    const cellCount = width * height;
    const state = createFluidState({
      width,
      height,
      volume: Array(cellCount).fill(0.5),
      velocityX: Array.from(
        { length: cellCount },
        (_, cell) => Math.sin(cell * 1.7) * 0.8
      ),
      velocityY: Array.from(
        { length: cellCount },
        (_, cell) => Math.cos(cell * 0.9) * 0.8
      ),
    });
    const projected = stepFluid(state).state;
    const before = rmsDivergence(state);
    const after = rmsDivergence(projected);

    expect(after).toBeLessThan(before * 0.2);
    expect(totalVolume(projected)).toBeCloseTo(320, 10);
    expect(projected.velocityX.every(value => Math.abs(value) <= 1)).toBe(true);
    expect(projected.velocityY.every(value => Math.abs(value) <= 1)).toBe(true);
    expect(stepFluid(state).state).toEqual(projected);
  });

  it('keeps solid interfaces impermeable during pressure projection', () => {
    const state = createFluidState({
      width: 3,
      height: 1,
      volume: [0.5, 0, 0.5],
      velocityX: [1, 1, 1],
      solids: [false, true, false],
    });
    const projected = stepFluid(state).state;
    expect(projected.velocityX[1]).toBe(0);
    expect(projected.velocityY[1]).toBe(0);
    expect(projected.volume).toEqual([0.5, 0, 0.5]);
  });

  it('stabilizes a varied closed field over repeated deterministic steps', () => {
    let state = createFluidState({
      width: 8,
      height: 6,
      volume: Array(48).fill(0.5),
      velocityX: Array.from(
        { length: 48 },
        (_, cell) => Math.sin(cell * 1.7) * 0.8
      ),
      velocityY: Array.from(
        { length: 48 },
        (_, cell) => Math.cos(cell * 0.9) * 0.8
      ),
      solids: Array.from(
        { length: 48 },
        (_, cell) => cell === 19 || cell === 27
      ),
    });
    const replay = createFluidState({
      width: 8,
      height: 6,
      volume: Array(48).fill(0.5),
      velocityX: Array.from(
        { length: 48 },
        (_, cell) => Math.sin(cell * 1.7) * 0.8
      ),
      velocityY: Array.from(
        { length: 48 },
        (_, cell) => Math.cos(cell * 0.9) * 0.8
      ),
      solids: Array.from(
        { length: 48 },
        (_, cell) => cell === 19 || cell === 27
      ),
    });
    for (let tick = 0; tick < 600; tick += 1) {
      state = stepFluid(state).state;
    }
    let replayed = replay;
    for (let tick = 0; tick < 600; tick += 1) {
      replayed = stepFluid(replayed).state;
    }
    expect(state).toEqual(replayed);
    expect(rmsDivergence(state)).toBeLessThan(0.05);
    expect(totalVolume(state)).toBeCloseTo(24, 10);
    expect(state.volume.every(value => value >= 0 && value <= 1)).toBe(true);
    expect(state.velocityX.every(value => Math.abs(value) <= 1)).toBe(true);
    expect(state.velocityY.every(value => Math.abs(value) <= 1)).toBe(true);
  });

  it('supports reverse momentum and limits a donor to its available volume', () => {
    const reverseFlow = createFluidState({
      width: 2,
      height: 1,
      volume: [0.5, 0.5],
      velocityX: [-1, -1],
    });
    expect(stepFluid(reverseFlow, { dt: 0.1 }).state.volume[0]).toBeGreaterThan(
      0.5
    );

    const limited = createFluidState({
      width: 1,
      height: 2,
      volume: [0.001, 0],
    });
    const result = stepFluid(limited, { dt: 0.1 });
    expect(result.state.volume[0]).toBe(0);
    expect(totalVolume(result.state)).toBeCloseTo(0.001);

    const fullColumn = createFluidState({
      width: 1,
      height: 2,
      volume: [1, 1],
    });
    const fullResult = stepFluid(fullColumn, { dt: 0.1 });
    expect(fullResult.state.volume).toEqual([1, 1]);
    expect(totalVolume(fullResult.state)).toBe(2);
  });

  it('accounts for capped sources and drains explicitly', () => {
    const state = createFluidState({ width: 2, height: 1, volume: [0.75, 0] });

    const result = stepFluid(state, {
      dt: 0.01,
      sources: [{ cell: 0, volume: 0.5 }],
      drains: [{ cell: 1, volume: 0.2 }],
    });

    expect(result.sourced).toBeCloseTo(0.25);
    expect(result.drained).toBe(0);
    expect(totalVolume(result.state)).toBeCloseTo(1);
  });

  it('drains available water and closes velocity faces in a single-cell basin', () => {
    const state = createFluidState({
      width: 1,
      height: 1,
      volume: [0.6],
      velocityX: [0.5],
      velocityY: [-0.5],
      viscosity: 0.2,
    });

    const result = stepFluid(state, { drains: [{ cell: 0, volume: 0.2 }] });

    expect(result.drained).toBe(0.2);
    expect(result.state.volume[0]).toBeCloseTo(0.4);
    expect(result.state.velocityX[0]).toBe(0);
    expect(result.state.velocityY[0]).toBe(0);
  });

  it('validates dimensions, physical ranges, transfer requests, and step size', () => {
    expect(() => createFluidState({ width: 0, height: 1 })).toThrow(RangeError);
    expect(() => createFluidState({ width: 1, height: 1.5 })).toThrow(
      RangeError
    );
    expect(() => createFluidState({ width: 1e10, height: 1e10 })).toThrow(
      RangeError
    );
    expect(() =>
      createFluidState({ width: 1, height: 1, viscosity: 2 })
    ).toThrow(RangeError);
    expect(() =>
      createFluidState({ width: 2, height: 1, volume: [0] })
    ).toThrow(RangeError);
    expect(() =>
      createFluidState({ width: 1, height: 1, volume: [2] })
    ).toThrow(RangeError);
    expect(() =>
      createFluidState({ width: 1, height: 1, solids: [1] })
    ).toThrow(TypeError);
    expect(() =>
      createFluidState({ width: 1, height: 1, solids: [false, true] })
    ).toThrow(RangeError);

    const state = createFluidState({ width: 1, height: 1 });
    expect(() => stepFluid(null)).toThrow(TypeError);
    expect(() => stepFluid({ ...state, volume: [] })).toThrow(TypeError);
    expect(() => stepFluid(state, { dt: 0 })).toThrow(RangeError);
    expect(() => stepFluid(state, { dt: 1 })).toThrow(RangeError);
    expect(() => stepFluid(state, { sources: {} })).toThrow(TypeError);
    expect(() =>
      stepFluid(state, { sources: [{ cell: -1, volume: 1 }] })
    ).toThrow(RangeError);
    expect(() =>
      stepFluid(state, { drains: [{ cell: 0, volume: 0 }] })
    ).toThrow(RangeError);
  });
});

/**
 * Calculate RMS divergence from stored right/down face-normal velocities.
 * @param {import('../../../../src/core/browser/game/chronoflow/chronoflow.js').FluidState} state Grid state.
 * @returns {number} RMS discrete divergence.
 */
function rmsDivergence(state) {
  const divergence = fluidDivergence(state);
  return Math.sqrt(divergence.reduce((sum, value) => sum + value * value, 0));
}

/**
 * @param {import('../../../../src/core/browser/game/chronoflow/chronoflow.js').FluidState} state Grid state.
 * @returns {number[]} Cell divergence with solid faces omitted.
 */
function fluidDivergence(state) {
  return state.volume.map((_, cell) => {
    if (state.solids[cell]) return 0;
    const x = cell % state.width;
    const y = Math.floor(cell / state.width);
    const left =
      x > 0 && !state.solids[cell - 1] ? state.velocityX[cell - 1] : 0;
    const right =
      x + 1 < state.width && !state.solids[cell + 1]
        ? state.velocityX[cell]
        : 0;
    const up =
      y > 0 && !state.solids[cell - state.width]
        ? state.velocityY[cell - state.width]
        : 0;
    const down =
      y + 1 < state.height && !state.solids[cell + state.width]
        ? state.velocityY[cell]
        : 0;
    return right - left + down - up;
  });
}

describe('Chronoflow Archive Entry runtime', () => {
  it('lets the player reshape marked cells within a reversible edit budget', () => {
    const initial = createChronoflowGame();
    expect(initial.fluid.solids[7]).toBe(true);
    expect(initial.fluid.solids[11]).toBe(true);
    expect(initial.editBudget).toBe(3);
    for (const cell of [1, 6, 13, 19, -1, 7.5]) {
      expect(toggleChronoflowChannel(initial, cell)).toBe(initial);
    }

    const carved = toggleChronoflowChannel(initial, 7);
    expect(carved.fluid.solids[7]).toBe(false);
    expect(carved.editsUsed).toBe(1);
    expect(initial.fluid.solids[7]).toBe(true);
    const refilled = toggleChronoflowChannel(carved, 7);
    expect(refilled.fluid.solids[7]).toBe(true);
    expect(refilled.editsUsed).toBe(2);
    const atBudget = toggleChronoflowChannel(refilled, 11);
    expect(atBudget.editsUsed).toBe(3);
    expect(toggleChronoflowChannel(atBudget, 7)).toBe(atBudget);
    const timed = { ...initial, mode: 'timed' };
    expect(
      toggleChronoflowChannel(timed, 7, {
        status: 'synchronized',
        epochMs: 60000,
      })
    ).toBe(timed);
    expect(
      toggleChronoflowChannel(timed, 7, {
        status: 'synchronized',
        epochMs: 45000,
        uncertaintyMs: 1000,
      }).fluid.solids[7]
    ).toBe(false);
    expect(
      toggleChronoflowChannel({ ...atBudget, completed: true }, 7)
    ).toMatchObject({
      completed: true,
      editsUsed: 3,
    });
    expect(resetChronoflow()).toMatchObject({ editsUsed: 0, editBudget: 3 });
  });

  it('solves Archive Entry by carving either authored channel shortcut', () => {
    for (const cell of [7, 11]) {
      let game = toggleChronoflowChannel(createChronoflowGame(), cell);
      game = openSluice(setChronoflowRoute(game, 'archive'));
      for (let batch = 0; batch < 30 && !game.completed; batch += 1) {
        game = advanceChronoflow(game, 60);
      }
      expect(game.completed).toBe(true);
      expect(game.fluid.volume[game.targetCell]).toBeGreaterThanOrEqual(
        game.targetVolume
      );
    }
  });

  it('keeps the gate closed until the player opens it and does not mutate earlier state', () => {
    const initial = createChronoflowGame();
    const advancedWhileClosed = advanceChronoflow(initial, 120);
    expect(advancedWhileClosed.fluid.volume[19]).toBe(0);
    expect(totalVolume(advancedWhileClosed.fluid)).toBeLessThan(1);
    expect(initial.route).toBe('drain');
    expect(openSluice(initial)).toBe(initial);

    const archiveRoute = setChronoflowRoute(initial, 'archive');
    expect(archiveRoute.route).toBe('archive');
    expect(archiveRoute.fluid.solids[12]).toBe(false);
    expect(archiveRoute.fluid.solids[16]).toBe(true);
    expect(setChronoflowRoute(initial, 'other')).toBe(initial);
    expect(setChronoflowRoute(archiveRoute, 'drain').fluid.solids[16]).toBe(
      false
    );

    const opened = openSluice(archiveRoute);
    expect(opened.gateOpen).toBe(true);
    expect(opened.fluid.solids[13]).toBe(false);
    expect(advancedWhileClosed.fluid.solids[13]).toBe(true);
    expect(openSluice(opened)).toBe(opened);
  });

  it('replays the authored solution to the target and keeps completed state stable', () => {
    let game = toggleChronoflowChannel(
      setChronoflowRoute(createChronoflowGame(), 'archive'),
      11
    );
    game = openSluice(game);
    for (let batch = 0; batch < 30 && !game.completed; batch += 1) {
      game = advanceChronoflow(game, 60);
    }

    expect(game.completed).toBe(true);
    expect(game.fluid.volume[game.targetCell]).toBeGreaterThanOrEqual(
      game.targetVolume
    );
    expect(advanceChronoflow(game, 60)).toBe(game);
    expect(openSluice(game)).toBe(game);
    expect(setChronoflowRoute(game, 'drain')).toBe(game);
  });

  it('starts and advances timed play only inside a fresh high-tide window', () => {
    const practice = createChronoflowGame();
    const highTide = {
      status: 'synchronized',
      epochMs: 45000,
      uncertaintyMs: 1000,
    };
    expect(startTimedRun(practice, null)).toBe(practice);
    expect(startTimedRun(practice, { ...highTide, epochMs: 60000 })).toBe(
      practice
    );
    expect(startTimedRun(practice, { ...highTide, uncertaintyMs: 15000 })).toBe(
      practice
    );
    expect(startTimedRun(practice, { ...highTide, status: 'stale' })).toBe(
      practice
    );

    const timed = startTimedRun(practice, highTide);
    expect(timed.mode).toBe('timed');
    expect(startTimedRun(timed, highTide)).toBe(timed);
    const archiveRoute = setChronoflowRoute(timed, 'archive');
    expect(openSluice(archiveRoute, { ...highTide, epochMs: 60000 })).toBe(
      archiveRoute
    );
    const opened = openSluice(archiveRoute, highTide);
    expect(opened.gateOpen).toBe(true);
    expect(advanceChronoflow(opened, 1, { ...highTide, status: 'stale' })).toBe(
      opened
    );
    expect(advanceChronoflow(opened, 1, highTide).fluid.tick).toBe(1);
    expect(resetChronoflow().mode).toBe('practice');
  });

  it('awards timed completion only in the synchronized high-tide phase', () => {
    let completed = openSluice(
      toggleChronoflowChannel(
        setChronoflowRoute(createChronoflowGame(), 'archive'),
        11
      )
    );
    for (let batch = 0; batch < 30 && !completed.completed; batch += 1) {
      completed = advanceChronoflow(completed, 60);
    }

    const timedCompletion = { ...completed, mode: 'timed' };
    expect(
      startTimedRun(completed, {
        status: 'synchronized',
        epochMs: 45000,
        uncertaintyMs: 1000,
      })
    ).toBe(completed);
    expect(
      finalizeChronoflowObjective(completed, {
        status: 'synchronized',
        epochMs: 30000,
      }).timedCredit
    ).toBe(false);
    for (const [epochMs, expected] of [
      [0, false],
      [30000, true],
      [60000, false],
      [90000, false],
    ]) {
      expect(
        finalizeChronoflowObjective(timedCompletion, {
          status: 'synchronized',
          epochMs,
        }).timedCredit
      ).toBe(expected);
    }
    expect(
      finalizeChronoflowObjective(timedCompletion, {
        status: 'stale',
        epochMs: 30000,
      }).timedCredit
    ).toBe(false);
    expect(
      finalizeChronoflowObjective(timedCompletion, {
        status: 'synchronized',
        epochMs: null,
      }).timedCredit
    ).toBe(false);
    expect(finalizeChronoflowObjective(timedCompletion, null).timedCredit).toBe(
      false
    );
    const incomplete = createChronoflowGame();
    expect(finalizeChronoflowObjective(incomplete, null)).toBe(incomplete);
  });

  it('resets puzzle state and validates fixed-step batch limits', () => {
    const reset = resetChronoflow();
    expect(reset.gateOpen).toBe(false);
    expect(reset.route).toBe('drain');
    expect(reset.fluid.solids[13]).toBe(true);
    expect(reset.fluid.tick).toBe(0);
    expect(advanceChronoflow(reset, 0)).toBe(reset);
    expect(() => advanceChronoflow(reset, -1)).toThrow(RangeError);
    expect(() => advanceChronoflow(reset, 601)).toThrow(RangeError);
  });
});

describe('Chronoflow page presenter', () => {
  it('renders accessible cells, handles controls, and disposes listeners', () => {
    const documentObj = { createElement: () => new FakeElement() };
    const grid = new FakeElement();
    const status = new FakeElement();
    const clockStatus = new FakeElement();
    const inspectStatus = new FakeElement();
    const openButton = new FakeElement();
    const advanceButton = new FakeElement();
    const resetButton = new FakeElement();
    const routeButton = new FakeElement();
    const editButton = new FakeElement();
    const startTimedButton = new FakeElement();
    const fetchImpl = jest.fn(async () => ({ ok: false, status: 503 }));

    const dispose = startChronoflowPage({
      documentObj,
      grid,
      status,
      clockStatus,
      inspectStatus,
      openButton,
      advanceButton,
      resetButton,
      routeButton,
      editButton,
      startTimedButton,
      fetchImpl,
      monotonicNow: () => 0,
      setIntervalImpl: () => 1,
      clearIntervalImpl: jest.fn(),
    });

    expect(grid.children).toHaveLength(20);
    expect(grid.children[13].getAttribute('aria-label')).toBe(
      'Sluice gate, closed.'
    );
    expect(clockStatus.textContent).toMatch(/Untimed practice/);
    expect(inspectStatus.textContent).toContain(
      'Cell 2 · channel · depth 100% · head 1.00'
    );
    expect(grid.children[1].getAttribute('aria-pressed')).toBe('true');
    grid.children[2].emit('click');
    expect(inspectStatus.textContent).toContain('Cell 3 · stone · depth 0%');
    expect(grid.children[2].getAttribute('aria-pressed')).toBe('true');
    expect(openButton.disabled).toBe(true);

    grid.children[11].emit('click');
    editButton.emit('click');
    routeButton.emit('click');
    expect(routeButton.textContent).toBe('Route valve to drain');
    expect(openButton.disabled).toBe(false);

    openButton.emit('click');
    expect(grid.children[13].getAttribute('aria-label')).toBe(
      'Sluice gate, open.'
    );
    advanceButton.emit('click');
    expect(
      grid.children.some(cell => cell.dataset.flowDirection !== 'still')
    ).toBe(true);
    for (
      let batch = 0;
      batch < 30 && !status.textContent.includes('complete');
      batch += 1
    ) {
      advanceButton.emit('click');
    }
    expect(status.textContent).toBe(
      'Archive chamber primed. Practice complete; no timed record.'
    );
    expect(advanceButton.disabled).toBe(true);

    resetButton.emit('click');
    expect(status.textContent).toContain('step 0');
    expect(openButton.disabled).toBe(true);
    dispose();
    expect(openButton.listeners.has('click')).toBe(false);
    expect(routeButton.listeners.has('click')).toBe(false);
    expect(advanceButton.listeners.has('click')).toBe(false);
    expect(resetButton.listeners.has('click')).toBe(false);
  });

  it('lets the player reshape a selected marked channel cell', () => {
    const grid = new FakeElement();
    const editButton = new FakeElement();
    const routeButton = new FakeElement();
    const dispose = startChronoflowPage({
      documentObj: { createElement: () => new FakeElement() },
      grid,
      status: new FakeElement(),
      clockStatus: new FakeElement(),
      openButton: new FakeElement(),
      advanceButton: new FakeElement(),
      resetButton: new FakeElement(),
      editButton,
      routeButton,
      fetchImpl: async () => ({ ok: false, status: 503 }),
      monotonicNow: () => 0,
      setIntervalImpl: () => 1,
      clearIntervalImpl: () => {},
    });

    expect(grid.children[7].dataset.editable).toBe('true');
    expect(grid.children[7].getAttribute('aria-label')).toContain(
      'Editable channel site'
    );
    routeButton.emit('click');
    expect(routeButton.textContent).toBe('Route valve to drain');
    routeButton.emit('click');
    expect(routeButton.textContent).toBe('Route valve to archive');
    expect(editButton.disabled).toBe(true);
    grid.children[7].emit('click');
    expect(editButton.disabled).toBe(false);
    editButton.emit('click');
    expect(grid.children[7].dataset.solid).toBe('false');
    expect(editButton.textContent).toContain('2 edits left');
    dispose();
    expect(editButton.listeners.has('click')).toBe(false);
  });

  it('loads configured Internet time, reports the trusted tide, and clears refresh timer', async () => {
    const documentObj = { createElement: () => new FakeElement() };
    const grid = new FakeElement();
    const status = new FakeElement();
    const clockStatus = new FakeElement();
    const openButton = new FakeElement();
    const advanceButton = new FakeElement();
    const resetButton = new FakeElement();
    const routeButton = new FakeElement();
    const editButton = new FakeElement();
    const startTimedButton = new FakeElement();
    let clockUnavailable = false;
    const fetchImpl = jest.fn(async endpoint => {
      if (endpoint === '/config.json') {
        return {
          ok: true,
          json: async () => ({ chronoflowTimeUrl: '/trusted-time' }),
        };
      }
      return clockUnavailable
        ? { ok: false, status: 503 }
        : { ok: true, json: async () => ({ epochMs: 1_800_000_045_000 }) };
    });
    let monotonic = 100;
    let intervalHandler;
    const clearIntervalImpl = jest.fn();

    const dispose = startChronoflowPage({
      documentObj,
      grid,
      status,
      clockStatus,
      openButton,
      advanceButton,
      resetButton,
      routeButton,
      editButton,
      startTimedButton,
      fetchImpl,
      monotonicNow: () => {
        monotonic += 100;
        return monotonic;
      },
      setIntervalImpl: handler => {
        intervalHandler = handler;
        return 7;
      },
      clearIntervalImpl,
    });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(fetchImpl).toHaveBeenNthCalledWith(1, '/config.json', {
      cache: 'no-store',
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(2, '/trusted-time', {
      cache: 'no-store',
    });
    expect(clockStatus.textContent).toContain('Internet tide synchronized');
    expect(clockStatus.textContent).toContain('Tide:');
    expect(typeof intervalHandler).toBe('function');
    expect(routeButton.textContent).toBe('Route valve to archive');
    expect(startTimedButton.disabled).toBe(false);
    grid.children[11].emit('click');
    editButton.emit('click');
    startTimedButton.emit('click');
    expect(status.textContent).toContain('Timed attempt');
    routeButton.emit('click');
    openButton.emit('click');
    for (
      let batch = 0;
      batch < 30 && !status.textContent.includes('complete');
      batch += 1
    ) {
      advanceButton.emit('click');
    }
    expect(status.textContent).toContain('Timed high-tide record secured');
    intervalHandler();
    expect(clockStatus.textContent).toContain('Internet tide synchronized');
    clockUnavailable = true;
    monotonic = 40000;
    intervalHandler();
    expect(clockStatus.textContent).toContain('Internet tide clock is stale');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(clockStatus.textContent).toContain('Internet tide clock is stale');
    dispose();
    expect(clearIntervalImpl).toHaveBeenCalledWith(7);
    expect(startTimedButton.listeners.has('click')).toBe(false);
  });

  it('shows a timed attempt paused when trusted time leaves high tide', async () => {
    const elements = Array.from({ length: 7 }, () => new FakeElement());
    const [
      grid,
      status,
      clockStatus,
      openButton,
      advanceButton,
      resetButton,
      startTimedButton,
    ] = elements;
    const editButton = new FakeElement();
    let monotonic = 100;
    let intervalHandler;
    const fetchImpl = jest.fn(async endpoint =>
      endpoint === '/config.json'
        ? {
            ok: true,
            json: async () => ({ chronoflowTimeUrl: '/trusted-time' }),
          }
        : { ok: true, json: async () => ({ epochMs: 1_800_000_045_000 }) }
    );
    const dispose = startChronoflowPage({
      documentObj: { createElement: () => new FakeElement() },
      grid,
      status,
      clockStatus,
      openButton,
      advanceButton,
      resetButton,
      editButton,
      startTimedButton,
      fetchImpl,
      monotonicNow: () => monotonic,
      setIntervalImpl: handler => {
        intervalHandler = handler;
        return 11;
      },
      clearIntervalImpl: () => {},
    });
    await new Promise(resolve => setTimeout(resolve, 0));

    startTimedButton.emit('click');
    expect(status.textContent).toContain('Timed attempt');
    grid.children[7].emit('click');
    expect(editButton.disabled).toBe(false);
    editButton.emit('click');
    expect(grid.children[7].dataset.solid).toBe('false');
    monotonic = 20_000;
    intervalHandler();
    expect(clockStatus.textContent).toContain('Timed attempt paused');
    expect(openButton.disabled).toBe(true);
    expect(advanceButton.disabled).toBe(true);
    expect(editButton.disabled).toBe(true);
    dispose();
  });

  it('keeps practice when config omits the configured clock endpoint', async () => {
    const elements = Array.from({ length: 6 }, () => new FakeElement());
    const [grid, status, clockStatus, openButton, advanceButton, resetButton] =
      elements;
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({}),
    }));
    const dispose = startChronoflowPage({
      documentObj: { createElement: () => new FakeElement() },
      grid,
      status,
      clockStatus,
      openButton,
      advanceButton,
      resetButton,
      fetchImpl,
      monotonicNow: () => 0,
      setIntervalImpl: () => 8,
      clearIntervalImpl: () => {},
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(clockStatus.textContent).toContain('Internet tide unavailable');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('does not retry while a clock request is pending and stops after disposal', () => {
    const elements = Array.from({ length: 6 }, () => new FakeElement());
    const [grid, status, clockStatus, openButton, advanceButton, resetButton] =
      elements;
    const fetchImpl = jest.fn(() => new Promise(() => {}));
    let monotonic = 0;
    let intervalHandler;
    const dispose = startChronoflowPage({
      documentObj: { createElement: () => new FakeElement() },
      grid,
      status,
      clockStatus,
      openButton,
      advanceButton,
      resetButton,
      fetchImpl,
      monotonicNow: () => monotonic,
      setIntervalImpl: handler => {
        intervalHandler = handler;
        return 9;
      },
      clearIntervalImpl: () => {},
    });
    monotonic = 16000;
    intervalHandler();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    dispose();
    intervalHandler();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('uses and clears the default interval adapters', () => {
    const elements = Array.from({ length: 6 }, () => new FakeElement());
    const [grid, status, clockStatus, openButton, advanceButton, resetButton] =
      elements;
    const dispose = startChronoflowPage({
      documentObj: { createElement: () => new FakeElement() },
      grid,
      status,
      clockStatus,
      openButton,
      advanceButton,
      resetButton,
      fetchImpl: async () => ({ ok: false, status: 503 }),
      monotonicNow: () => 0,
    });
    dispose();
  });

  it('does not render a clock response after the page has been disposed', async () => {
    let resolveConfig;
    const fetchImpl = jest.fn(endpoint =>
      endpoint === '/config.json'
        ? new Promise(resolve => {
            resolveConfig = resolve;
          })
        : Promise.resolve({
            ok: true,
            json: async () => ({ epochMs: 1_800_000_000_000 }),
          })
    );
    const elements = Array.from({ length: 6 }, () => new FakeElement());
    const [grid, status, clockStatus, openButton, advanceButton, resetButton] =
      elements;
    const dispose = startChronoflowPage({
      documentObj: { createElement: () => new FakeElement() },
      grid,
      status,
      clockStatus,
      openButton,
      advanceButton,
      resetButton,
      fetchImpl,
      monotonicNow: () => 10,
      setIntervalImpl: () => 10,
      clearIntervalImpl: () => {},
    });
    dispose();
    resolveConfig({
      ok: true,
      json: async () => ({ chronoflowTimeUrl: '/trusted-time' }),
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(clockStatus.textContent).toContain('Connecting');
  });
});
