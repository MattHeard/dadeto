import { describe, expect, it } from '@jest/globals';
import {
  createFluidState,
  stepFluid,
} from '../../../../src/core/browser/game/chronoflow/chronoflow.js';

/**
 * Sum the water in a fluid grid.
 * @param {import('../../../../src/core/browser/game/chronoflow/chronoflow.js').FluidState} state Fluid grid.
 * @returns {number} Total water volume.
 */
function totalVolume(state) {
  return state.volume.reduce((total, amount) => total + amount, 0);
}

describe('Chronoflow deterministic fluid core', () => {
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

  it('drains available water and damps momentum in a single-cell basin', () => {
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
    expect(result.state.velocityX[0]).toBeCloseTo(0.4);
    expect(result.state.velocityY[0]).toBeCloseTo(-0.4);
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
