import {
  advanceThreefoldSluicePuzzle,
  createThreefoldSluicePuzzle,
  getThreefoldSluicePuzzleStatus,
  operateThreefoldSluiceValve,
} from '../../../../src/core/browser/game/threefold/water-puzzle.js';
import { heightAtScale } from '../../../../src/core/browser/game/threefold/spatial.js';

const WATER_STEP_SECONDS = 15;
const WATER_STEP_COUNT = 5;

describe('THREEFOLD small-world sluice puzzle model', () => {
  test('starts with a closed port and a dry lower crossing', () => {
    const puzzle = createThreefoldSluicePuzzle();
    const status = getThreefoldSluicePuzzleStatus(puzzle, -1);

    expect(puzzle.port.open).toBe(false);
    expect(status).toMatchObject({
      portOpen: false,
      lowerBasinRaised: false,
      crossingAvailable: false,
    });
    expect(status.lowerWaterSurfaceElevationMeters).toBe(0.1);
  });

  test('allows the small-scale service valve to toggle only at scale -2', () => {
    const initial = createThreefoldSluicePuzzle();

    for (let scale = -4; scale <= 4; scale += 1) {
      if (scale === -2) continue;
      expect(operateThreefoldSluiceValve(initial, scale)).toBe(initial);
    }

    const opened = operateThreefoldSluiceValve(initial, -2);
    const closed = operateThreefoldSluiceValve(opened, -2);
    expect(opened.port.open).toBe(true);
    expect(closed.port.open).toBe(false);
    expect(initial.port.open).toBe(false);
  });

  test('keeps water still while the valve is closed', () => {
    const puzzle = createThreefoldSluicePuzzle();

    expect(advanceThreefoldSluicePuzzle(puzzle, 60)).toBe(puzzle);
  });

  test('raises the lower basin through explicit time steps while conserving volume', () => {
    const initial = createThreefoldSluicePuzzle();
    const puzzle = raiseLowerBasin(initial);

    const totalVolume = puzzle.chambers.reduce(
      (total, chamber) => total + chamber.volumeCubicMeters,
      0
    );
    const status = getThreefoldSluicePuzzleStatus(puzzle, -1);

    expect(totalVolume).toBeCloseTo(0.2, 12);
    expect(puzzle.chambers[0].volumeCubicMeters).toBeLessThan(0.15);
    expect(puzzle.chambers[1].volumeCubicMeters).toBeGreaterThan(0.05);
    expect(status.lowerBasinRaised).toBe(true);
    expect(status.crossingAvailable).toBe(true);
    expect(initial.chambers[0].volumeCubicMeters).toBe(0.15);
    expect(initial.chambers[1].volumeCubicMeters).toBe(0.05);
  });

  test('derives crossing availability from both water height and player scale', () => {
    const puzzle = raiseLowerBasin(createThreefoldSluicePuzzle());

    expect(getThreefoldSluicePuzzleStatus(puzzle, -2).crossingAvailable).toBe(
      false
    );
    expect(getThreefoldSluicePuzzleStatus(puzzle, -1).crossingAvailable).toBe(
      true
    );
  });

  test('keeps physical water levels identical across all nine rendered scales', () => {
    const puzzle = raiseLowerBasin(createThreefoldSluicePuzzle());

    const viewHeights = [];
    const waterLevels = [];
    for (let scale = -4; scale <= 4; scale += 1) {
      viewHeights.push(heightAtScale(scale));
      const status = getThreefoldSluicePuzzleStatus(puzzle, scale);
      waterLevels.push(status.lowerWaterSurfaceElevationMeters);
    }

    expect(new Set(viewHeights)).toHaveProperty('size', 9);
    expect(new Set(waterLevels)).toHaveProperty('size', 1);
    expect(puzzle.chambers[0].volumeCubicMeters).toBeGreaterThan(0);
  });

  test('rejects unsupported rendered scales and invalid elapsed time', () => {
    const puzzle = createThreefoldSluicePuzzle();

    expect(() => operateThreefoldSluiceValve(puzzle, -5)).toThrow(RangeError);
    expect(() => getThreefoldSluicePuzzleStatus(puzzle, 5)).toThrow(RangeError);
    expect(() => advanceThreefoldSluicePuzzle(puzzle, -1)).toThrow(RangeError);
  });
});

/**
 * Open the service valve and simulate five explicit quarter-minute actions.
 * @param {ReturnType<typeof createThreefoldSluicePuzzle>} initial Initial puzzle state.
 * @returns {ReturnType<typeof createThreefoldSluicePuzzle>} Puzzle state with the lower crossing raised.
 */
function raiseLowerBasin(initial) {
  let puzzle = operateThreefoldSluiceValve(initial, -2);
  for (let step = 0; step < WATER_STEP_COUNT; step += 1)
    puzzle = advanceThreefoldSluicePuzzle(puzzle, WATER_STEP_SECONDS);
  return puzzle;
}
