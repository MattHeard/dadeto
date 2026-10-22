import { heightAtScale } from './spatial.js';

const GRAVITY_METERS_PER_SECOND_SQUARED = 9.80665;
const DISCHARGE_COEFFICIENT = 0.62;

/** @typedef {{id: string, floorElevationMeters: number, areaSquareMeters: number, volumeCubicMeters: number}} WaterPuzzleChamber */
/** @typedef {{open: boolean, areaSquareMeters: number, sillElevationMeters: number}} WaterPuzzlePort */
/** @typedef {{chambers: WaterPuzzleChamber[], port: WaterPuzzlePort, crossingSurfaceElevationMeters: number}} TwoChamberWaterPuzzle */

/**
 * Advance water through one openable port between two physical chambers.
 * Water volume stays in cubic metres, so changing the rendered scale does not
 * change the underlying hydraulic state.
 * @param {{id: string, floorElevationMeters: number, areaSquareMeters: number, volumeCubicMeters: number}} chamberA First chamber.
 * @param {{id: string, floorElevationMeters: number, areaSquareMeters: number, volumeCubicMeters: number}} chamberB Second chamber.
 * @param {{open: boolean, areaSquareMeters: number, sillElevationMeters: number}} port Shared opening between chambers.
 * @param {number} durationSeconds Elapsed simulation time in seconds.
 * @returns {{chambers: Array<{id: string, floorElevationMeters: number, areaSquareMeters: number, volumeCubicMeters: number}>, transferredVolumeCubicMeters: number, sourceChamberId: string|null}} Updated chambers and the transferred amount.
 */
export function flowWaterThroughPort(
  chamberA,
  chamberB,
  port,
  durationSeconds
) {
  assertChamber(chamberA);
  assertChamber(chamberB);
  if (chamberA.id === chamberB.id)
    throw new RangeError('Chamber identifiers must be distinct.');
  assertPort(port);
  assertAtLeast(durationSeconds, 0, 'durationSeconds');

  if (!port.open || durationSeconds === 0) return noFlow(chamberA, chamberB);

  const headA = waterSurfaceElevation(chamberA);
  const headB = waterSurfaceElevation(chamberB);
  if (headA === headB) return noFlow(chamberA, chamberB);

  const source = headA > headB ? chamberA : chamberB;
  const receiver = source.id === chamberA.id ? chamberB : chamberA;
  const sourceHead = waterSurfaceElevation(source);
  const receiverHead = waterSurfaceElevation(receiver);
  if (source.volumeCubicMeters === 0 || sourceHead <= port.sillElevationMeters)
    return noFlow(chamberA, chamberB);

  const drivingHead =
    sourceHead - Math.max(receiverHead, port.sillElevationMeters);
  const equalizationVolume =
    (sourceHead - receiverHead) /
    (1 / source.areaSquareMeters + 1 / receiver.areaSquareMeters);
  const flowRate =
    DISCHARGE_COEFFICIENT *
    port.areaSquareMeters *
    Math.sqrt(2 * GRAVITY_METERS_PER_SECOND_SQUARED * drivingHead);
  const volumeAboveSill =
    (sourceHead - port.sillElevationMeters) * source.areaSquareMeters;
  const transferredVolumeCubicMeters = Math.min(
    flowRate * durationSeconds,
    equalizationVolume,
    source.volumeCubicMeters,
    volumeAboveSill
  );
  const updatedSource = {
    ...source,
    volumeCubicMeters: source.volumeCubicMeters - transferredVolumeCubicMeters,
  };
  const updatedReceiver = {
    ...receiver,
    volumeCubicMeters:
      receiver.volumeCubicMeters + transferredVolumeCubicMeters,
  };
  const chambers =
    source.id === chamberA.id
      ? [updatedSource, updatedReceiver]
      : [updatedReceiver, updatedSource];

  return {
    chambers,
    transferredVolumeCubicMeters,
    sourceChamberId: source.id,
  };
}

/**
 * Validate the physical dimensions and identity of a chamber.
 * @param {{id: string, floorElevationMeters: number, areaSquareMeters: number, volumeCubicMeters: number}} chamber Candidate chamber.
 * @returns {void}
 */
function assertChamber(chamber) {
  if (chamber === null || typeof chamber !== 'object')
    throw new TypeError('A chamber object is required.');
  if (typeof chamber.id !== 'string' || chamber.id.length === 0)
    throw new TypeError('A chamber identifier is required.');
  assertFinite(chamber.floorElevationMeters, 'floorElevationMeters');
  assertAtLeast(chamber.areaSquareMeters, Number.MIN_VALUE, 'areaSquareMeters');
  assertAtLeast(chamber.volumeCubicMeters, 0, 'volumeCubicMeters');
}

/**
 * Validate the physical opening and its controllable state.
 * @param {{open: boolean, areaSquareMeters: number, sillElevationMeters: number}} port Candidate port.
 * @returns {void}
 */
function assertPort(port) {
  if (port === null || typeof port !== 'object')
    throw new TypeError('A port object is required.');
  if (typeof port.open !== 'boolean')
    throw new TypeError('Port open state must be boolean.');
  assertAtLeast(port.areaSquareMeters, Number.MIN_VALUE, 'areaSquareMeters');
  assertFinite(port.sillElevationMeters, 'sillElevationMeters');
}

/**
 * Reject non-finite physical measurements.
 * @param {unknown} value Candidate measurement.
 * @param {string} name Measurement name for the error.
 * @returns {void}
 */
function assertFinite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new RangeError(`${name} must be finite.`);
}

/**
 * Reject non-finite measurements below their physical minimum.
 * @param {unknown} value Candidate measurement.
 * @param {number} minimum Minimum permitted value.
 * @param {string} name Measurement name for the error.
 * @returns {void}
 */
function assertAtLeast(value, minimum, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum)
    throw new RangeError(`${name} must be at least ${minimum}.`);
}

/**
 * Return the water surface elevation in metres.
 * @param {{floorElevationMeters: number, areaSquareMeters: number, volumeCubicMeters: number}} chamber Chamber with validated physical values.
 * @returns {number} Water surface elevation in metres.
 */
function waterSurfaceElevation(chamber) {
  return (
    chamber.floorElevationMeters +
    chamber.volumeCubicMeters / chamber.areaSquareMeters
  );
}

/**
 * Return a chamber's physical water-surface elevation.
 * @param {{id: string, floorElevationMeters: number, areaSquareMeters: number, volumeCubicMeters: number}} chamber Chamber with physical dimensions and water volume.
 * @returns {number} Surface elevation in metres.
 */
export function getWaterSurfaceElevationMeters(chamber) {
  assertChamber(chamber);
  return waterSurfaceElevation(chamber);
}

/**
 * Normalize the shared state shape for a two-chamber water puzzle.
 * @param {unknown} candidate Candidate puzzle state.
 * @param {{chambers: WaterPuzzleChamber[], port: WaterPuzzlePort, crossingSurfaceElevationMeters: number, totalVolumeCubicMeters: number, totalVolumeTolerance: number, name: string}} authored Authored puzzle configuration.
 * @returns {TwoChamberWaterPuzzle} Canonical validated state.
 */
export function normalizeTwoChamberWaterPuzzle(candidate, authored) {
  if (!candidate || typeof candidate !== 'object')
    throw new TypeError(`${authored.name} state must be an object.`);
  const { chambers, port, crossingSurfaceElevationMeters } =
    /** @type {Record<string, any>} */ (candidate);
  if (
    !Array.isArray(chambers) ||
    chambers.length !== authored.chambers.length ||
    !port ||
    typeof port !== 'object' ||
    typeof port.open !== 'boolean' ||
    port.areaSquareMeters !== authored.port.areaSquareMeters ||
    port.sillElevationMeters !== authored.port.sillElevationMeters ||
    crossingSurfaceElevationMeters !== authored.crossingSurfaceElevationMeters
  )
    throw new RangeError(`${authored.name} configuration is inconsistent.`);

  const normalizedChambers = authored.chambers.map((configuration, index) => {
    const chamber = chambers[index];
    if (
      !chamber ||
      chamber.id !== configuration.id ||
      chamber.floorElevationMeters !== configuration.floorElevationMeters ||
      chamber.areaSquareMeters !== configuration.areaSquareMeters
    )
      throw new RangeError(`${authored.name} chamber is inconsistent.`);
    const normalized = {
      ...configuration,
      volumeCubicMeters: chamber.volumeCubicMeters,
    };
    getWaterSurfaceElevationMeters(normalized);
    return normalized;
  });
  const totalVolume = normalizedChambers.reduce(
    (total, chamber) => total + chamber.volumeCubicMeters,
    0
  );
  if (
    Math.abs(totalVolume - authored.totalVolumeCubicMeters) >
    authored.totalVolumeTolerance
  )
    throw new RangeError(`${authored.name} water volume is not conserved.`);
  return {
    chambers: normalizedChambers,
    port: { ...authored.port, open: port.open },
    crossingSurfaceElevationMeters: authored.crossingSurfaceElevationMeters,
  };
}

/**
 * Toggle a water-puzzle valve when the player is at its authored scale.
 * The caller validates physical scale and interaction reach.
 * @param {TwoChamberWaterPuzzle} state Current puzzle.
 * @param {number} playerScale Current scale.
 * @param {number} valveScale Scale at which the valve can be used.
 * @returns {TwoChamberWaterPuzzle} Updated puzzle or the original state.
 */
export function operateTwoChamberWaterValve(state, playerScale, valveScale) {
  if (playerScale !== valveScale) return state;
  return { ...state, port: { ...state.port, open: !state.port.open } };
}

/**
 * Create a valve operation that validates scale and enforces its service rung.
 * @param {number} valveScale Authored scale at which the valve can be reached.
 * @returns {(state: TwoChamberWaterPuzzle, playerScale: number) => TwoChamberWaterPuzzle} Scale-checked valve operator.
 */
export function createTwoChamberWaterValveOperator(valveScale) {
  return function operateWaterPuzzleValve(state, playerScale) {
    heightAtScale(playerScale);
    return operateTwoChamberWaterValve(state, playerScale, valveScale);
  };
}

/**
 * Advance a two-chamber puzzle through the shared physical port solver.
 * @param {TwoChamberWaterPuzzle} state Current puzzle.
 * @param {number} durationSeconds Explicit simulated duration.
 * @returns {TwoChamberWaterPuzzle} Updated puzzle or the original state when water did not move.
 */
export function advanceTwoChamberWaterPuzzle(state, durationSeconds) {
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
 * Read both authored chamber surface elevations.
 * @param {TwoChamberWaterPuzzle} state Current water puzzle.
 * @returns {[number, number]} First and second surface elevations in metres.
 */
export function getTwoChamberWaterSurfaceElevations(state) {
  return [
    getWaterSurfaceElevationMeters(state.chambers[0]),
    getWaterSurfaceElevationMeters(state.chambers[1]),
  ];
}

/**
 * Return an unchanged, explicit no-flow result.
 * @param {{id: string, floorElevationMeters: number, areaSquareMeters: number, volumeCubicMeters: number}} chamberA First unchanged chamber.
 * @param {{id: string, floorElevationMeters: number, areaSquareMeters: number, volumeCubicMeters: number}} chamberB Second unchanged chamber.
 * @returns {{chambers: Array<{id: string, floorElevationMeters: number, areaSquareMeters: number, volumeCubicMeters: number}>, transferredVolumeCubicMeters: number, sourceChamberId: null}} No-flow result.
 */
function noFlow(chamberA, chamberB) {
  return {
    chambers: [chamberA, chamberB],
    transferredVolumeCubicMeters: 0,
    sourceChamberId: null,
  };
}
