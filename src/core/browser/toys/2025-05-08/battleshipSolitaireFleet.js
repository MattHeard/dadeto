/*
 * Battleship Solitaire – Fleet Generator (JavaScript version)
 * ----------------------------------------------------------
 * Toy signature:  generateFleet(input: string, env: Env): string
 *   input : JSON string of a BattleshipSolitaireConfiguration
 *   env   : { getRandomNumber, getCurrentTime, getData, setData }
 * Returns a JSON string of a RevealedBattleshipFleet or { error }
 * @returns {string} JSON string describing the generated fleet or error.
 *
 * Notes:
 *   • Assumes input is trusted – minimal sanity checks only.
 *   • No diagonal placement; honours optional noTouching flag.
 */

/**
 * @typedef {{ x: number, y: number }} Coord
 * @typedef {{ width: number | string, height: number | string, ships: Array<number | string> | string, noTouching?: boolean }} RawFleetConfig
 * @typedef {{ width: number, height: number, ships: number[], noTouching?: boolean }} FleetConfig
 * @typedef {{ direction: 'H' | 'V', start: Coord, length: number }} Candidate
 * @typedef {{ cfg: FleetConfig, occupied: Set<string> }} BoardState
 * @typedef {{ segs: Coord[], valid: boolean }} SegmentAccumulator
 * @typedef {{ width: number, height: number, ships: Candidate[] }} GeneratedFleet
 */

// ────────────────────── Helper utilities ────────────────────── //

/**
 * Fisher‑Yates shuffle (in‑place) using env RNG.
 * @param {number[]} arr - Array of ship lengths to shuffle.
 * @param {Map<string, Function>} env - Environment with RNG helper.
 * @returns {void}
 */
function shuffle(arr, env) {
  const getRandomNumber = /** @type {() => number} */ (
    env.get('getRandomNumber')
  );
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(getRandomNumber() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

const key = (x, y) => `${x},${y}`;

/**
 * Check whether a coordinate sits at or beyond the origin.
 * @param {Coord} coord - Grid coordinate.
 * @returns {boolean} True when both axes are non-negative.
 */
function isCoordNonNegative(coord) {
  return coord.x >= 0 && coord.y >= 0;
}

/**
 * @param {Coord} coord - Candidate position.
 * @param {FleetConfig} cfg - Board dimensions.
 * @returns {boolean} True when x and y fall inside the board.
 */
function isCoordWithinBoard(coord, cfg) {
  return coord.x < cfg.width && coord.y < cfg.height;
}

/**
 * @param {Coord} coord - Candidate position.
 * @param {FleetConfig} cfg - Board dimensions.
 * @returns {boolean} True when the coordinate fully lies on the board.
 */
function inBounds(coord, cfg) {
  return isCoordNonNegative(coord) && isCoordWithinBoard(coord, cfg);
}

/**
 * 8‑neighbour coordinates
 * @param {number} dx - Horizontal offset.
 * @param {number} dy - Vertical offset.
 * @returns {boolean} True when the offset refers to the origin.
 */
function isOrigin(dx, dy) {
  return dx === 0 && dy === 0;
}

/**
 * @param {Coord} coord - Center coordinate.
 * @param {number} dy - Vertical offset.
 * @returns {(row: Coord[], dx: number) => Coord[]} Reducer that accumulates neighbouring coordinates.
 */
function dxReducerForNeighbour(coord, dy) {
  return (row, dx) => {
    if (isOrigin(dx, dy)) {
      return row;
    } else {
      const neighbour = { x: coord.x + dx, y: coord.y + dy };
      return row.concat(neighbour);
    }
  };
}

/**
 * @param {Coord} coord - Center coordinate.
 * @returns {Coord[]} All 8 neighbouring coordinates.
 */
function neighbours(coord) {
  return [-1, 0, 1].reduce((acc, dy) => {
    return acc.concat([-1, 0, 1].reduce(dxReducerForNeighbour(coord, dy), []));
  }, []);
}

/**
 * Determine whether a neighbouring coordinate is already occupied.
 * @param {Coord} n - Candidate neighbour coordinate.
 * @param {FleetConfig} cfg - Board dimensions.
 * @param {Set<string>} occupied - Occupied coordinate keys.
 * @returns {boolean} True when the neighbour lies inside the board and is occupied.
 */
function isNeighbourOccupied(n, cfg, occupied) {
  return inBounds(n, cfg) && occupied.has(key(n.x, n.y));
}

const makeSegHasNoOccupiedNeighbour = (cfg, occupied) => seg =>
  !neighbours(seg).some(n => isNeighbourOccupied(n, cfg, occupied));

/**
 * Adjust the coordinate based on direction.
 * @param {{ dir: 'H' | 'V', value: number, delta: number, axis: 'H' | 'V' }} config - Coordinate adjustment options.
 * @returns {number} Updated coordinate.
 */
function adjustCoordinate({ dir, value, delta, axis }) {
  if (dir === axis) {
    return value + delta;
  }
  return value;
}

/**
 * Advance the horizontal coordinate for the candidate placement.
 * @param {'H' | 'V'} dir - Direction of the ship.
 * @param {number} x - Starting column index.
 * @param {number} i - Offset along the ship length.
 * @returns {number} New column index.
 */
function getSx(dir, x, i) {
  return adjustCoordinate({ dir, value: x, delta: i, axis: 'H' });
}

/**
 * Advance the vertical coordinate for the candidate placement.
 * @param {'H' | 'V'} dir - Direction of the ship.
 * @param {number} y - Starting row index.
 * @param {number} i - Offset along the ship length.
 * @returns {number} New row index.
 */
function getSy(dir, y, i) {
  return adjustCoordinate({ dir, value: y, delta: i, axis: 'V' });
}

/**
 * Compute the ending column for the ship.
 * @param {'H' | 'V'} dir - Direction of the ship.
 * @param {number} x - Starting column.
 * @param {number} len - Length of the ship.
 * @returns {number} Column index of the end coordinate.
 */
function getEndX(dir, x, len) {
  return adjustCoordinate({
    dir,
    value: x,
    delta: len - 1,
    axis: 'H',
  });
}

/**
 * Compute the ending row for the ship.
 * @param {'H' | 'V'} dir - Direction of the ship.
 * @param {number} y - Starting row.
 * @param {number} len - Length of the ship.
 * @returns {number} Row index of the end coordinate.
 */
function getEndY(dir, y, len) {
  return adjustCoordinate({
    dir,
    value: y,
    delta: len - 1,
    axis: 'V',
  });
}

/**
 * Compute the coordinate of the last segment for a ship.
 * @param {'H' | 'V'} dir - Direction of the ship.
 * @param {Coord} start - Starting coordinate.
 * @param {number} len - Length of the ship.
 * @returns {Coord} Ending coordinate.
 */
function getEndCoord(dir, start, len) {
  return { x: getEndX(dir, start.x, len), y: getEndY(dir, start.y, len) };
}

// ─────────────────── Placement attempt (single pass) ─────────────────── //

/**
 * Build a reducer for validating segment placements.
 * @param {'H' | 'V'} dir - Direction for the ship.
 * @param {Coord} start - Starting coordinate for the ship.
 * @param {Set<string>} occupied - Occupied coordinate keys.
 * @returns {(acc: SegmentAccumulator, _: Coord | undefined, i: number) => SegmentAccumulator} Reducer for segment validation.
 */
function makeSegReducer(dir, start, occupied) {
  return (
    /**
     * @param {SegmentAccumulator} acc - Accumulated segment state.
     * @param {Coord | undefined} _ - Placeholder for reduce value.
     * @param {number} i - Segment offset.
     * @returns {SegmentAccumulator}
     */
    (acc, _, i) =>
      handleSegment({ acc, placement: { dir, start } }, occupied, i)
  );

  /**
   * @param {{ acc: SegmentAccumulator, placement: { dir: 'H' | 'V', start: Coord } }} segment - Segment state.
   * @param {Set<string>} occupied - Occupied coordinates.
   * @param {number} i - Segment index.
   * @returns {SegmentAccumulator}
   */
  function handleSegment(segment, occupied, i) {
    const { acc, placement } = segment;
    if (!acc.valid) {
      return acc;
    }
    const { dir, start } = placement;
    const sx = getSx(dir, start.x, i);
    const sy = getSy(dir, start.y, i);
    return getNextAccumulator({ acc, sx, sy }, occupied);
  }

  /**
   * @param {{ acc: SegmentAccumulator, sx: number, sy: number }} segment - Candidate segment state.
   * @param {Set<string>} occupied - Occupied coordinates.
   * @returns {SegmentAccumulator}
   */
  function getNextAccumulator(segment, occupied) {
    const { acc, sx, sy } = segment;
    if (isSegmentOccupied(occupied, sx, sy)) {
      return { ...acc, valid: false };
    }
    return addSegmentToAccumulator(acc, sx, sy);
  }

  /**
   * @param {Set<string>} occupied - Occupied coordinate keys.
   * @param {number} sx - Column index.
   * @param {number} sy - Row index.
   * @returns {boolean}
   */
  function isSegmentOccupied(occupied, sx, sy) {
    const k = key(sx, sy);
    return occupied.has(k);
  }

  /**
   * @param {SegmentAccumulator} acc - Current accumulator.
   * @param {number} sx - Column index.
   * @param {number} sy - Row index.
   * @returns {SegmentAccumulator}
   */
  function addSegmentToAccumulator(acc, sx, sy) {
    return { ...acc, segs: [...acc.segs, { x: sx, y: sy }] };
  }
}

const allSegsHaveNoOccupiedNeighbour = (cfg, occupied, segs) => {
  const segHasNoOccupiedNeighbour = makeSegHasNoOccupiedNeighbour(
    cfg,
    occupied
  );
  return segs.every(segHasNoOccupiedNeighbour);
};

/**
 * Determine whether the placement violates the no-touching rule.
 * @param {FleetConfig} cfg - Board configuration.
 * @param {Set<string>} occupied - Occupied coordinates.
 * @param {Coord[]} segs - Candidate segments.
 * @returns {boolean}
 */
function isForbiddenTouch(cfg, occupied, segs) {
  return (
    cfg.noTouching === true &&
    !allSegsHaveNoOccupiedNeighbour(cfg, occupied, segs)
  );
}

/**
 * Validate the candidate placement based on board state and occupancy.
 * @param {BoardState} boardState - Board configuration with occupied cells.
 * @param {Coord[]} segs - Candidate segments.
 * @param {boolean} valid - Indicator that the segments are still valid.
 * @returns {boolean}
 */
function isValidCandidate(boardState, segs, valid) {
  if (!valid) {
    return false;
  }
  const forbiddenTouch = isForbiddenTouch(
    boardState.cfg,
    boardState.occupied,
    segs
  );
  return !forbiddenTouch;
}

/**
 * Gather valid candidates for the provided starting coordinate.
 * @param {{ start: Coord, length: number, cfg: FleetConfig, occupied: Set<string> }} params - Candidate context.
 * @returns {Candidate[]} Valid candidates for both directions.
 */
function collectCandidatesForStart({ start, length, cfg, occupied }) {
  const directions = ['H', 'V'];
  const candidates = [];
  for (const direction of directions) {
    collectCandidatesForDirection({
      direction,
      start,
      length,
      cfg,
      occupied,
      candidates,
    });
  }
  return candidates;
}

/**
 * Evaluate a single direction for a starting coordinate.
 * @param {{ direction: 'H' | 'V', start: Coord, length: number, cfg: FleetConfig, occupied: Set<string>, candidates: Candidate[] }} params - Directional context.
 * @returns {void}
 */
function collectCandidatesForDirection({
  direction,
  start,
  length,
  cfg,
  occupied,
  candidates,
}) {
  const candidate = getCandidateIfInBounds({
    direction,
    start,
    length,
    cfg,
    occupied,
  });
  if (candidate) {
    candidates.push(candidate);
  }
}

/**
 * Check whether the candidate is within board bounds and valid.
 * @param {{ direction: 'H' | 'V', start: Coord, length: number, cfg: FleetConfig, occupied: Set<string> }} params - Candidate context.
 * @returns {Candidate | null} Valid candidate or null when out of bounds.
 */
function getCandidateIfInBounds({ direction, start, length, cfg, occupied }) {
  const endCoord = getEndCoord(direction, start, length);
  if (!inBounds(endCoord, cfg)) {
    return null;
  }
  return getValidCandidate({ direction, start, length, cfg, occupied });
}

/**
 * Validate candidate segments once in bounds.
 * @param {{ direction: 'H' | 'V', start: Coord, length: number, cfg: FleetConfig, occupied: Set<string> }} params - Candidate context.
 * @returns {Candidate | null} Valid candidate or null when blocked.
 */
function getValidCandidate({ direction, start, length, cfg, occupied }) {
  const segReducer = makeSegReducer(direction, start, occupied);
  const { segs, valid } = Array.from({ length }).reduce(segReducer, {
    segs: [],
    valid: true,
  });
  if (isValidCandidate({ cfg, occupied }, segs, valid)) {
    return { start, length, direction };
  }
  return null;
}

/**
 * Enumerate all candidates for a ship length across the board.
 * @param {number} length - Ship length to place.
 * @param {FleetConfig} cfg - Board configuration.
 * @param {Set<string>} occupied - Occupied coordinates.
 * @returns {Candidate[]} Candidate placements.
 */
function collectAllCandidates(length, cfg, occupied) {
  const candidates = /** @type {Candidate[]} */ ([]);
  for (let y = 0; y < cfg.height; y++) {
    collectCandidatesForRow({ y, length, cfg, occupied, candidates });
  }
  return candidates;
}

/**
 * Collect candidates for a row at a given y coordinate.
 * @param {{ y: number, length: number, cfg: FleetConfig, occupied: Set<string>, candidates: Candidate[] }} params - Row context.
 * @returns {void}
 */
function collectCandidatesForRow({ y, length, cfg, occupied, candidates }) {
  for (let x = 0; x < cfg.width; x++) {
    const start = { x, y };
    const localCandidates = collectCandidatesForStart({
      start,
      length,
      cfg,
      occupied,
    });
    candidates.push(...localCandidates);
  }
}

/**
 * Mark the squares covered by the chosen candidate as occupied.
 * @param {Candidate} chosen - Selected candidate placement.
 * @param {Set<string>} occupied - Occupied coordinate keys.
 * @param {number} length - Ship length.
 * @returns {void}
 */
function markOccupiedSquares(chosen, occupied, length) {
  for (let i = 0; i < length; i++) {
    const sx = getSx(chosen.direction, chosen.start.x, i);
    const sy = getSy(chosen.direction, chosen.start.y, i);
    occupied.add(key(sx, sy));
  }
}

/**
 * Randomly select a candidate and mark its cells as occupied.
 * @param {{ candidates: Candidate[], length: number }} payload - Candidate collection and length.
 * @param {Map<string, Function>} env - Environment supplying the RNG.
 * @param {Set<string>} occupied - Occupied coordinate keys to update.
 * @returns {Candidate | null} Chosen candidate or null when none available.
 */
function chooseAndMarkCandidate({ candidates, length }, env, occupied) {
  if (candidates.length === 0) {
    return null;
  } // dead end
  const getRandomNumber = /** @type {() => number} */ (
    env.get('getRandomNumber')
  );
  const chosen = candidates[Math.floor(getRandomNumber() * candidates.length)];
  // Mark occupied squares
  markOccupiedSquares(chosen, occupied, length);
  return chosen;
}

/**
 * Attempt to place a ship segment of the given length.
 * @param {number} length - Ship length.
 * @param {BoardState} boardState - Current board with occupied cells.
 * @param {Map<string, Function>} env - Environment providing RNG.
 * @returns {Candidate | null} Candidate when placement succeeds or null when blocked.
 */
function placeShip(length, boardState, env) {
  const { cfg, occupied } = boardState;
  const candidates = collectAllCandidates(length, cfg, occupied);
  return chooseAndMarkCandidate({ candidates, length }, env, occupied);
}

/**
 * Create a placement helper that maintains occupancy state.
 * @param {FleetConfig} cfg - Board configuration.
 * @param {Map<string, Function>} env - Environment providing RNG.
 * @returns {(length: number) => Candidate | null} Placement helper.
 */
function makePlaceShip(cfg, env) {
  const occupied = new Set();
  return len => placeShip(len, { cfg, occupied }, env);
}

/**
 * Determine whether placement should abort for the current accumulator.
 * @param {Candidate[] | null} acc - Accumulated placements or null when failed.
 * @returns {boolean}
 */
function shouldAbortPlaceShip(acc) {
  return acc === null;
}

/**
 * Build a reducer that slots ships sequentially.
 * @param {(length: number) => Candidate | null} placeShipWithArgs - Placement helper.
 * @returns {(acc: Candidate[] | null, len: number) => Candidate[] | null} Reducer used during placement.
 */
function makePlaceShipReducer(placeShipWithArgs) {
  return (acc, len) => {
    if (shouldAbortPlaceShip(acc)) {
      return null;
    }
    const placed = placeShipWithArgs(len);
    if (!placed || !acc) {
      return null;
    }
    acc.push(placed);
    return acc;
  };
}

/**
 * Place all ships on the board by shuffling lengths and reducing placements.
 * @param {FleetConfig} cfg - Board configuration.
 * @param {Map<string, Function>} env - Environment providing RNG.
 * @returns {Candidate[] | null} List of placed candidates or null on failure.
 */
function placeAllShips(cfg, env) {
  const lengths = cfg.ships.slice();
  shuffle(lengths, env);
  const placeShipWithArgs = makePlaceShip(cfg, env);
  const placeShipReducer = makePlaceShipReducer(placeShipWithArgs);
  const result = lengths.reduce(placeShipReducer, []);
  if (result !== null) {
    return result;
  }
  return null;
}

/**
 * Attempt to place all ships once to produce a fleet.
 * @param {FleetConfig} cfg - Board configuration.
 * @param {Map<string, Function>} env - Environment with RNG.
 * @returns {GeneratedFleet | null} Fleet object when successful or null when failed.
 */
function attemptPlacement(cfg, env) {
  const ships = placeAllShips(cfg, env);
  if (!ships) {
    return null;
  }
  return { width: cfg.width, height: cfg.height, ships };
}

/**
 * Check whether the total ship segments exceed the board area.
 * @param {FleetConfig} cfg - Board configuration.
 * @returns {boolean} True when the ships cannot fit on the board.
 */
function exceedsBoardArea(cfg) {
  const totalSegments = cfg.ships.reduce((s, l) => s + l, 0);
  return totalSegments > cfg.width * cfg.height;
}

/**
 * Ensure the `ships` property is an array.
 * @param {FleetConfig & { ships: unknown }} cfg - Board configuration parsed from input.
 * @returns {void}
 */
function ensureShipsArray(cfg) {
  if (!Array.isArray(cfg.ships)) {
    cfg.ships = [];
  }
}

// ─────────────────────────── Public toy ─────────────────────────── //

/**
 * Parse the provided JSON input and fall back to defaults on failure.
 * @param {string} input - JSON configuration string.
 * @returns {RawFleetConfig} Parsed configuration or defaults.
 */
function safeJsonParse(input) {
  try {
    return JSON.parse(input);
  } catch {
    return { width: 10, height: 10, ships: [] };
  }
}

/**
 * Convert comma-separated ship lengths into an array of numbers.
 * @param {RawFleetConfig} cfg - Raw configuration.
 * @returns {void}
 */
function convertShipsToArray(cfg) {
  if (typeof cfg.ships === 'string') {
    cfg.ships = cfg.ships
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(Boolean);
  }
}

/**
 * Normalize a dimension value into a number.
 * @param {string | number} value - Dimension value.
 * @returns {number} Parsed number.
 */
function parseDimension(value) {
  if (typeof value === 'string') {
    return parseInt(value, 10);
  }
  return value;
}

/**
 * Convert the width and height fields to numbers.
 * @param {RawFleetConfig} cfg - Raw board configuration.
 * @returns {void}
 */
function parseDimensions(cfg) {
  cfg.width = parseDimension(cfg.width);
  cfg.height = parseDimension(cfg.height);
}

/**
 * Parse the raw config and normalize its fields.
 * @param {string} input - JSON configuration string.
 * @returns {FleetConfig} Normalized configuration.
 */
function parseConfig(input) {
  const cfg = safeJsonParse(input);
  convertShipsToArray(cfg);
  parseDimensions(cfg);
  ensureShipsArray(cfg);
  return cfg;
}

/**
 * @returns {string} Error payload when ships exceed the board area.
 */
function fleetAreaError() {
  return JSON.stringify({ error: 'Ship segments exceed board area' });
}

/**
 * @returns {string} Error payload when placement retries fail.
 */
function fleetRetryError() {
  return JSON.stringify({
    error: 'Failed to generate fleet after max retries',
  });
}

/**
 * Normalize the fleet result into explicit null when nothing found.
 * @param {GeneratedFleet | null} fleet - Candidate fleet.
 * @returns {GeneratedFleet | null} Fleet result or null.
 */
function maybeReturnFleet(fleet) {
  if (fleet !== null) {
    return fleet;
  }
  return null;
}

/**
 * Invoke an iteration of the fleet generation loop.
 * @param {number} i - Loop index (unused).
 * @param {FleetConfig} cfg - Board configuration.
 * @param {Map<string, Function>} env - Environment with RNG.
 * @returns {GeneratedFleet | null} Generated fleet or null when this iteration failed.
 */
function processFleetLoopIteration(i, cfg, env) {
  const fleet = attemptPlacement(cfg, env);
  const result = maybeReturnFleet(fleet);
  return result;
}

/**
 * Run the loop up to the maximum number of attempts.
 * @param {number} maxTries - Maximum attempts.
 * @param {(i: number) => GeneratedFleet | null} cb - Operation invoked per attempt.
 * @returns {GeneratedFleet | null} First successful fleet or null.
 */
function fleetLoopFor(maxTries, cb) {
  return (
    Array.from({ length: maxTries }, (_, i) => cb(i)).find(
      result => result !== null
    ) || null
  );
}

/**
 * Run the fleet generation loop.
 * @param {FleetConfig} cfg - Board configuration.
 * @param {Map<string, Function>} env - Environment with RNG.
 * @param {number} maxTries - Maximum number of attempts.
 * @returns {GeneratedFleet | null} Generated fleet or null.
 */
function runFleetLoop(cfg, env, maxTries) {
  return fleetLoopFor(maxTries, i => processFleetLoopIteration(i, cfg, env));
}

/**
 * Find a valid fleet by running the loop.
 * @param {FleetConfig} cfg - Board configuration.
 * @param {Map<string, Function>} env - Environment with RNG.
 * @param {number} maxTries - Maximum attempts.
 * @returns {GeneratedFleet | null} Valid fleet or null.
 */
function findValidFleet(cfg, env, maxTries) {
  return runFleetLoop(cfg, env, maxTries);
}

/**
 * Attempt to generate a fleet and serialize the result.
 * @param {FleetConfig} cfg - Board configuration.
 * @param {Map<string, Function>} env - Environment with RNG.
 * @param {number} maxTries - Maximum attempts.
 * @returns {string | null} JSON string for fleet or null when unsuccessful.
 */
function tryGenerateFleet(cfg, env, maxTries) {
  const fleet = findValidFleet(cfg, env, maxTries);
  if (fleet !== null) {
    return JSON.stringify(fleet);
  }
  return null;
}

/**
 * Entry point for the toy; generates a fleet string or error.
 * @param {string} input - JSON configuration string.
 * @param {Map<string, Function>} env - Environment with RNG helper.
 * @returns {string} JSON payload representing the fleet or an error.
 */
function generateFleet(input, env) {
  const cfg = parseConfig(input);
  if (shouldReturnAreaError(cfg)) {
    return fleetAreaError();
  }
  const MAX_TRIES = 100;
  const fleetResult = tryGenerateFleet(cfg, env, MAX_TRIES);
  return getFleetResultOrError(fleetResult);
}

/**
 * Determine whether the area error should be returned.
 * @param {FleetConfig} cfg - Board configuration.
 * @returns {boolean}
 */
function shouldReturnAreaError(cfg) {
  return exceedsBoardArea(cfg);
}

/**
 * Convert the fleet generation result into the final response string.
 * @param {string | null} fleetResult - Serialized fleet or null.
 * @returns {string} Fleet JSON or error payload.
 */
function getFleetResultOrError(fleetResult) {
  if (fleetResult !== null) {
    return fleetResult;
  }
  return fleetRetryError();
}

export {
  generateFleet,
  placeAllShips,
  isCoordNonNegative,
  isCoordWithinBoard,
  neighbours,
};
