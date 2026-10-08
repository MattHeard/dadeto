import {
  advanceWaterPuzzle,
  createWaterPuzzle,
  editWaterChannel,
  openWaterGate,
  resetWaterPuzzle,
  setWaterRoute,
} from '../../../../src/core/browser/game/the-commons-of-tomorrow/puzzle.js';

/**
 *
 */
/** @returns {Record<string, any>} Completed deterministic puzzle state. */
function solveCommonsInlet() {
  let puzzle = setWaterRoute(createWaterPuzzle(), 'commons');
  puzzle = editWaterChannel(puzzle, 11);
  puzzle = openWaterGate(puzzle);
  return advanceWaterPuzzle(puzzle, 600);
}

describe('Commons deterministic water board', () => {
  test('replays the same bounded solution to the commons inlet', () => {
    const first = solveCommonsInlet();
    const second = solveCommonsInlet();
    expect(first.completed).toBe(true);
    expect(first.fluid).toEqual(second.fluid);
    expect(first.fluid.volume[19]).toBeGreaterThanOrEqual(0.1);
    expect(first.editsUsed).toBe(1);
  });

  test('rejects invalid routes, unmarked edits, and edits beyond the budget', () => {
    const fresh = createWaterPuzzle();
    expect(setWaterRoute(fresh, 'unknown')).toBe(fresh);
    expect(setWaterRoute(fresh, 'commons').route).toBe('commons');
    expect(setWaterRoute(fresh, 'marsh').route).toBe('marsh');
    expect(editWaterChannel(fresh, 1)).toBe(fresh);
    const full = {
      ...fresh,
      editsUsed: 3,
    };
    expect(editWaterChannel(full, 11)).toBe(full);
    expect(openWaterGate(fresh)).toBe(fresh);
    expect(openWaterGate(setWaterRoute(fresh, 'commons')).gateOpen).toBe(true);
  });

  test('bounds fixed-step advancement and resets to the authored board', () => {
    expect(() => advanceWaterPuzzle(createWaterPuzzle(), -1)).toThrow(
      RangeError
    );
    expect(() => advanceWaterPuzzle(createWaterPuzzle(), 601)).toThrow(
      RangeError
    );
    const changed = editWaterChannel(createWaterPuzzle(), 11);
    expect(resetWaterPuzzle()).toEqual(createWaterPuzzle());
    expect(advanceWaterPuzzle(createWaterPuzzle()).fluid).toEqual(
      advanceWaterPuzzle(createWaterPuzzle(), 60).fluid
    );
    expect(changed.editsUsed).toBe(1);
  });

  test('completed puzzles ignore later edits and simulation steps', () => {
    const complete = solveCommonsInlet();
    expect(editWaterChannel(complete, 7)).toBe(complete);
    expect(advanceWaterPuzzle(complete, 60)).toBe(complete);
    expect(setWaterRoute(complete, 'marsh')).toBe(complete);
    expect(openWaterGate(complete)).toBe(complete);
  });

  test('rejects non-integer and over-budget edit counts', () => {
    expect(() => advanceWaterPuzzle(createWaterPuzzle(), 1.5)).toThrow(
      RangeError
    );
    expect(() =>
      advanceWaterPuzzle(createWaterPuzzle(), Number.MAX_SAFE_INTEGER + 1)
    ).toThrow(RangeError);
  });
});
