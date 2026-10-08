import { createFluidState, stepFluid } from '../chronoflow/chronoflow.js';

const WIDTH = 5;
const HEIGHT = 4;
const TARGET = 19;
const TARGET_VOLUME = 0.1;
const EDITABLE = Object.freeze([7, 11]);
const WALLS = Object.freeze([
  0, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
]);

/**
 * Return a puzzle snapshot with updated solid cells.
 * @param {Record<string, any>} puzzle Current water board.
 * @param {boolean[]} solids Updated static geometry.
 * @returns {Record<string, any>} Updated puzzle snapshot.
 */
function withSolids(puzzle, solids) {
  return { ...puzzle, fluid: { ...puzzle.fluid, solids } };
}

/**
 * Create a deterministic, untimed water-routing challenge.
 * @returns {Record<string, any>} Fresh puzzle state.
 */
export function createWaterPuzzle() {
  const solids = Array.from({ length: WIDTH * HEIGHT }, (_, index) =>
    WALLS.includes(index)
  );
  return {
    fluid: createFluidState({
      width: WIDTH,
      height: HEIGHT,
      volume: Array.from({ length: WIDTH * HEIGHT }, (_, index) =>
        index === 1 ? 1 : 0
      ),
      solids,
    }),
    gateOpen: false,
    route: 'marsh',
    editsUsed: 0,
    editBudget: 3,
    completed: false,
  };
}

/**
 * Select whether the water feeds the marsh bypass or common inlet.
 * @param {Record<string, any>} puzzle Current puzzle.
 * @param {'marsh'|'commons'} route Authored route.
 * @returns {Record<string, any>} Updated puzzle.
 */
export function setWaterRoute(puzzle, route) {
  if (puzzle.completed || !['marsh', 'commons'].includes(route)) return puzzle;
  const solids = [...puzzle.fluid.solids];
  solids[12] = route !== 'commons';
  solids[16] = route === 'commons';
  solids[17] = route === 'commons';
  solids[18] = route !== 'commons';
  return { ...withSolids(puzzle, solids), route };
}

/**
 * Toggle one marked channel tile within the bounded edit budget.
 * @param {Record<string, any>} puzzle Current puzzle.
 * @param {number} cell Selected cell.
 * @returns {Record<string, any>} Updated puzzle, or the original when rejected.
 */
export function editWaterChannel(puzzle, cell) {
  if (
    puzzle.completed ||
    !EDITABLE.includes(cell) ||
    puzzle.editsUsed >= puzzle.editBudget
  )
    return puzzle;
  const solids = [...puzzle.fluid.solids];
  solids[cell] = !solids[cell];
  return {
    ...puzzle,
    fluid: { ...puzzle.fluid, solids },
    editsUsed: puzzle.editsUsed + 1,
  };
}

/**
 * Open the archive gate after selecting the common inlet route.
 * @param {Record<string, any>} puzzle Current puzzle.
 * @returns {Record<string, any>} Updated puzzle.
 */
export function openWaterGate(puzzle) {
  if (puzzle.completed || puzzle.route !== 'commons') return puzzle;
  const solids = [...puzzle.fluid.solids];
  solids[13] = false;
  return { ...withSolids(puzzle, solids), gateOpen: true };
}

/**
 * Advance bounded fixed steps with no wall-clock dependency.
 * @param {Record<string, any>} puzzle Current puzzle.
 * @param {number} steps Fixed simulation steps.
 * @returns {Record<string, any>} Deterministic updated puzzle.
 */
export function advanceWaterPuzzle(puzzle, steps = 60) {
  if (!Number.isSafeInteger(steps) || steps < 0 || steps > 600) {
    throw new RangeError('Puzzle steps must be a safe integer from 0 to 600.');
  }
  let next = puzzle;
  for (let index = 0; index < steps && !next.completed; index += 1) {
    const fluid = stepFluid(next.fluid).state;
    next = {
      ...next,
      fluid,
      completed: fluid.volume[TARGET] >= TARGET_VOLUME,
    };
  }
  return next;
}

/**
 * Restore the authored board and edit budget.
 * @returns {Record<string, any>} Fresh puzzle state.
 */
export function resetWaterPuzzle() {
  return createWaterPuzzle();
}

export const WATER_PUZZLE = Object.freeze({
  width: WIDTH,
  height: HEIGHT,
  target: TARGET,
  targetVolume: TARGET_VOLUME,
  editableCells: EDITABLE,
});
