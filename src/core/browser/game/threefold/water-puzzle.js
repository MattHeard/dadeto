import { heightAtScale } from './spatial.js';
import {
  flowWaterThroughPort,
  getWaterSurfaceElevationMeters,
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
  if (!candidate || typeof candidate !== 'object')
    throw new TypeError('THREEFOLD sluice state must be an object.');
  const { chambers, port, crossingSurfaceElevationMeters } =
    /** @type {Record<string, any>} */ (candidate);
  if (
    !Array.isArray(chambers) ||
    chambers.length !== 2 ||
    !port ||
    typeof port !== 'object' ||
    typeof port.open !== 'boolean' ||
    port.areaSquareMeters !== CLOSED_PORT.areaSquareMeters ||
    port.sillElevationMeters !== CLOSED_PORT.sillElevationMeters ||
    crossingSurfaceElevationMeters !== CROSSING_SURFACE_ELEVATION_METERS
  )
    throw new RangeError('THREEFOLD sluice configuration is inconsistent.');

  const normalizedChambers = [UPPER_CHAMBER, LOWER_CHAMBER].map(
    (authored, index) => {
      const chamber = chambers[index];
      if (
        !chamber ||
        chamber.id !== authored.id ||
        chamber.floorElevationMeters !== authored.floorElevationMeters ||
        chamber.areaSquareMeters !== authored.areaSquareMeters
      )
        throw new RangeError('THREEFOLD sluice chamber is inconsistent.');
      const normalized = {
        ...authored,
        volumeCubicMeters: chamber.volumeCubicMeters,
      };
      getWaterSurfaceElevationMeters(normalized);
      return normalized;
    }
  );
  const totalVolume = normalizedChambers.reduce(
    (total, chamber) => total + chamber.volumeCubicMeters,
    0
  );
  if (Math.abs(totalVolume - TOTAL_PUZZLE_VOLUME_CUBIC_METERS) > 1e-9)
    throw new RangeError('THREEFOLD sluice water volume is not conserved.');

  return {
    chambers: normalizedChambers,
    port: { ...CLOSED_PORT, open: port.open },
    crossingSurfaceElevationMeters: CROSSING_SURFACE_ELEVATION_METERS,
  };
}

/**
 * Toggle the sluice valve. Its small service handle is reachable only at scale -2.
 * @param {ReturnType<typeof createThreefoldSluicePuzzle>} state Current puzzle.
 * @param {number} playerScale Current rendered player scale.
 * @returns {ReturnType<typeof createThreefoldSluicePuzzle>} Updated puzzle or the unchanged state when the valve is out of reach.
 */
export function operateThreefoldSluiceValve(state, playerScale) {
  heightAtScale(playerScale);
  if (playerScale !== VALVE_SCALE) return state;
  return { ...state, port: { ...state.port, open: !state.port.open } };
}

/**
 * Advance the sluice puzzle by an explicit amount of simulation time.
 * @param {ReturnType<typeof createThreefoldSluicePuzzle>} state Current puzzle.
 * @param {number} durationSeconds Explicit elapsed game time.
 * @returns {ReturnType<typeof createThreefoldSluicePuzzle>} Updated water volumes or the unchanged state when no water moved.
 */
export function advanceThreefoldSluicePuzzle(state, durationSeconds) {
  const flow = flowWaterThroughPort(
    state.chambers[0],
    state.chambers[1],
    state.port,
    durationSeconds
  );
  if (flow.transferredVolumeCubicMeters === 0) return state;
  return { ...state, chambers: flow.chambers };
}

/**
 * Derive the sluice puzzle view and whether the lower crossing is available.
 * @param {ReturnType<typeof createThreefoldSluicePuzzle>} state Current puzzle.
 * @param {number} playerScale Current rendered player scale.
 * @returns {{portOpen: boolean, upperWaterSurfaceElevationMeters: number, lowerWaterSurfaceElevationMeters: number, lowerBasinRaised: boolean, crossingAvailable: boolean}} Physical readout and scale-aware crossing state.
 */
export function getThreefoldSluicePuzzleStatus(state, playerScale) {
  heightAtScale(playerScale);
  const upperWaterSurfaceElevationMeters = getWaterSurfaceElevationMeters(
    state.chambers[0]
  );
  const lowerWaterSurfaceElevationMeters = getWaterSurfaceElevationMeters(
    state.chambers[1]
  );
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
