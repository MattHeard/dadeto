import { heightAtScale } from './spatial.js';
import {
  advanceTwoChamberWaterPuzzle,
  createTwoChamberWaterValveOperator,
  getTwoChamberWaterSurfaceElevations,
  normalizeTwoChamberWaterPuzzle,
} from './water.js';

const VALVE_SCALE = -2;
const CROSSING_SCALE = -1;
const UPPER_CHAMBER = {
  id: 'upper-reservoir',
  floorElevationMeters: 0.5,
  areaSquareMeters: 0.5,
  volumeCubicMeters: 0.15,
};
const LOWER_CHAMBER = {
  id: 'lower-basin',
  floorElevationMeters: 0,
  areaSquareMeters: 0.5,
  volumeCubicMeters: 0.05,
};
const CLOSED_PORT = {
  open: false,
  areaSquareMeters: 0.0008,
  sillElevationMeters: 0.15,
};
const CROSSING_SURFACE_ELEVATION_METERS = 0.3;
const TOTAL_PUZZLE_VOLUME_CUBIC_METERS =
  UPPER_CHAMBER.volumeCubicMeters + LOWER_CHAMBER.volumeCubicMeters;

/**
 * Create the authored two-chamber sluice puzzle in its closed starting state.
 * @returns {{chambers: Array<{id: string, floorElevationMeters: number, areaSquareMeters: number, volumeCubicMeters: number}>, port: {open: boolean, areaSquareMeters: number, sillElevationMeters: number}, crossingSurfaceElevationMeters: number}} Independent physical puzzle state.
 */
export function createThreefoldSluicePuzzle() {
  return {
    chambers: [{ ...UPPER_CHAMBER }, { ...LOWER_CHAMBER }],
    port: { ...CLOSED_PORT },
    crossingSurfaceElevationMeters: CROSSING_SURFACE_ELEVATION_METERS,
  };
}

/**
 * Validate a persisted sluice puzzle and rebuild its authored physical constants.
 * @param {unknown} candidate Candidate save state.
 * @returns {ReturnType<typeof createThreefoldSluicePuzzle>} Canonical independent puzzle state.
 */
export function normalizeThreefoldSluicePuzzle(candidate) {
  return normalizeTwoChamberWaterPuzzle(candidate, {
    chambers: [UPPER_CHAMBER, LOWER_CHAMBER],
    port: CLOSED_PORT,
    crossingSurfaceElevationMeters: CROSSING_SURFACE_ELEVATION_METERS,
    totalVolumeCubicMeters: TOTAL_PUZZLE_VOLUME_CUBIC_METERS,
    totalVolumeTolerance: 1e-9,
    name: 'THREEFOLD sluice',
  });
}

/**
 * Toggle the sluice valve at its authored service scale.
 * @param {ReturnType<typeof createThreefoldSluicePuzzle>} state Current puzzle.
 * @param {number} playerScale Current rendered player scale.
 * @param {number} [valveScale] Authored scale; defaults to the canonical valve rung.
 * @returns {ReturnType<typeof createThreefoldSluicePuzzle>} Updated puzzle or the unchanged state when the valve is out of reach.
 */
export function operateThreefoldSluiceValve(
  state,
  playerScale,
  valveScale = VALVE_SCALE
) {
  return createTwoChamberWaterValveOperator(valveScale)(state, playerScale);
}

/**
 * Advance the sluice puzzle by an explicit amount of simulation time.
 * @param {ReturnType<typeof createThreefoldSluicePuzzle>} state Current puzzle.
 * @param {number} durationSeconds Explicit elapsed game time.
 * @returns {ReturnType<typeof createThreefoldSluicePuzzle>} Updated water volumes or the unchanged state when no water moved.
 */
export const advanceThreefoldSluicePuzzle = advanceTwoChamberWaterPuzzle;

/**
 * Derive the sluice puzzle view and whether the lower crossing is available.
 * @param {ReturnType<typeof createThreefoldSluicePuzzle>} state Current puzzle.
 * @param {number} playerScale Current rendered player scale.
 * @returns {{portOpen: boolean, upperWaterSurfaceElevationMeters: number, lowerWaterSurfaceElevationMeters: number, lowerBasinRaised: boolean, crossingAvailable: boolean}} Physical readout and scale-aware crossing state.
 */
export function getThreefoldSluicePuzzleStatus(state, playerScale) {
  heightAtScale(playerScale);
  const [upperWaterSurfaceElevationMeters, lowerWaterSurfaceElevationMeters] =
    getTwoChamberWaterSurfaceElevations(state);
  const lowerBasinRaised =
    lowerWaterSurfaceElevationMeters >= state.crossingSurfaceElevationMeters;
  return {
    portOpen: state.port.open,
    upperWaterSurfaceElevationMeters,
    lowerWaterSurfaceElevationMeters,
    lowerBasinRaised,
    crossingAvailable: lowerBasinRaised && playerScale >= CROSSING_SCALE,
  };
}
