import * as water from './water.js';

const UPSTREAM_CHANNEL = {
  id: 'silt-margin-dew-channel',
  floorElevationMeters: 0,
  areaSquareMeters: 0.001,
  volumeCubicMeters: 0.00004,
};
const DOWNSTREAM_BASIN = {
  id: 'silt-margin-root-basin',
  floorElevationMeters: 0,
  areaSquareMeters: 0.001,
  volumeCubicMeters: 0,
};
const FINE_PORT = {
  open: false,
  areaSquareMeters: 0.000001,
  sillElevationMeters: 0.005,
};
const TOTAL_WATER_VOLUME_CUBIC_METERS = 0.00004;
const CROSSING_SURFACE_ELEVATION_METERS = 0.025;
const VALVE_SCALE = -4;

/** @typedef {{id: string, floorElevationMeters: number, areaSquareMeters: number, volumeCubicMeters: number}} SiltMarginWaterChamber */
/** @typedef {{chambers: SiltMarginWaterChamber[], port: {open: boolean, areaSquareMeters: number, sillElevationMeters: number}, crossingSurfaceElevationMeters: number}} SiltMarginWaterPuzzle */

/**
 * Create the Silt Margin dew-channel puzzle using physical SI values.
 * @param {{crossingOpen?: boolean}} [options] Whether to migrate a completed legacy signal route.
 * @returns {SiltMarginWaterPuzzle} Independent water state.
 */
export function createThreefoldSiltMarginWaterPuzzle(options = {}) {
  const crossingOpen = options.crossingOpen === true;
  return {
    chambers: crossingOpen
      ? [
          { ...UPSTREAM_CHANNEL, volumeCubicMeters: 0.00002 },
          { ...DOWNSTREAM_BASIN, volumeCubicMeters: 0.00002 },
        ]
      : [{ ...UPSTREAM_CHANNEL }, { ...DOWNSTREAM_BASIN }],
    port: { ...FINE_PORT, open: crossingOpen },
    crossingSurfaceElevationMeters: CROSSING_SURFACE_ELEVATION_METERS,
  };
}

/**
 * Validate saved Silt Margin water while reconstructing authored dimensions.
 * @param {unknown} candidate Candidate water state.
 * @returns {SiltMarginWaterPuzzle} Canonical physical water state.
 */
export function normalizeThreefoldSiltMarginWaterPuzzle(candidate) {
  return water.normalizeTwoChamberWaterPuzzle(candidate, {
    chambers: [UPSTREAM_CHANNEL, DOWNSTREAM_BASIN],
    port: FINE_PORT,
    crossingSurfaceElevationMeters: CROSSING_SURFACE_ELEVATION_METERS,
    totalVolumeCubicMeters: TOTAL_WATER_VOLUME_CUBIC_METERS,
    totalVolumeTolerance: 1e-12,
    name: 'Silt Margin water',
  });
}

/**
 * Create a Silt Margin valve operator at its authored interaction scale.
 * @param {number} [valveScale] Authored scale; defaults to the canonical fine rung.
 * @returns {(state: SiltMarginWaterPuzzle, playerScale: number) => SiltMarginWaterPuzzle} Operator for the authored scale.
 */
export const operateThreefoldSiltMarginValve = (valveScale = VALVE_SCALE) =>
  water.createTwoChamberWaterValveOperator(valveScale);

/**
 * Advance the dew channel only by explicit simulated time.
 * @param {SiltMarginWaterPuzzle} state Current water puzzle.
 * @param {number} durationSeconds Explicit world-action duration.
 * @returns {SiltMarginWaterPuzzle} Updated water state.
 */
export const advanceThreefoldSiltMarginWater =
  water.advanceTwoChamberWaterPuzzle;

/**
 * Derive the visible dew levels and crossing state.
 * @param {SiltMarginWaterPuzzle} state Current water puzzle.
 * @returns {{upstreamSurfaceElevationMeters: number, downstreamSurfaceElevationMeters: number, valveOpen: boolean, crossingAvailable: boolean}} Physical readout.
 */
export function getThreefoldSiltMarginWaterStatus(state) {
  const [upstreamSurfaceElevationMeters, downstreamSurfaceElevationMeters] =
    water.getTwoChamberWaterSurfaceElevations(state);
  return {
    upstreamSurfaceElevationMeters,
    downstreamSurfaceElevationMeters,
    valveOpen: state.port.open,
    crossingAvailable:
      upstreamSurfaceElevationMeters <= state.crossingSurfaceElevationMeters,
  };
}
