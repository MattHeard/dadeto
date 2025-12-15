/*
 * Battleship Solitaire – Fleet Generator (JavaScript version)
 * ----------------------------------------------------------
 * Toy signature:  generateFleet(input: string, env: Env): string
 *   input : JSON string of a BattleshipSolitaireConfiguration
 *   env   : { getRandomNumber, getCurrentTime, getData, setData }
 * Returns a JSON string of a RevealedBattleshipFleet or { error }
 *
 * Notes:
 *   • Assumes input is trusted – minimal sanity checks only.
 *   • No diagonal placement; honours optional noTouching flag.
 * @returns {*} - description
 */

// ────────────────────── Helper utilities ────────────────────── //

/**
 * Fisher‑Yates shuffle (in‑place) using env RNG
 * @param {*} arr - description
 * @param {*} env - description
 * @returns {*} - description
 */
function shuffle(arr, env) {
  const getRandomNumber = env.get('getRandomNumber');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(getRandomNumber() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

const key = (x, y) => `${x},${y}`;

/**
 *
 * @param {*} coord - description
 * @returns {*} - description
 */
function isCoordNonNegative(coord) {
  return coord.x >= 0 && coord.y >= 0;
}

/**
 *
 * @param {*} coord - description
 * @param {*} cfg - description
 * @returns {*} - description
 */
function isCoordWithinBoard(coord, cfg) {
  return coord.x < cfg.width && coord.y < cfg.height;
}

/**
 *
 * @param {*} coord - description
 * @param {*} cfg - description
 * @returns {*} - description
 */
function inBounds(coord, cfg) {
  return isCoordNonNegative(coord) && isCoordWithinBoard(coord, cfg);
}

/**
 * 8‑neighbour coordinates
 * @param {*} dx - description
 * @param {*} dy - description
 * @returns {*} - description
 */
function isOrigin(dx, dy) {
  return dx === 0 && dy === 0;
}

/**
 *
 * @param {*} coord - description
 * @param {*} dy - description
 * @returns {*} - description
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
 *
 * @param {*} coord - description
 * @returns {*} - description
 */
function neighbours(coord) {
  return [-1, 0, 1].reduce((acc, dy) => {
    return acc.concat([-1, 0, 1].reduce(dxReducerForNeighbour(coord, dy), []));
  }, []);
}

/**
 *
 * @param {*} n - description
 * @param {*} cfg - description
 * @param {*} occupied - description
 * @returns {*} - description
 */
function isNeighbourOccupied(n, cfg, occupied) {
  return inBounds(n, cfg) && occupied.has(key(n.x, n.y));
}

const makeSegHasNoOccupiedNeighbour = (cfg, occupied) => seg =>
  !neighbours(seg).some(n => isNeighbourOccupied(n, cfg, occupied));

/**
 *
 * @param {{ dir: string, value: number, delta: number, axis: string }} config - Coordinate adjustment options.
 * @returns {number} - Updated coordinate.
 */
function adjustCoordinate({ dir, value, delta, axis }) {
  if (dir === axis) {
    return value + delta;
  }
  return value;
}

/**
 *
 * @param {*} dir - description
 * @param {*} x - description
 * @param {*} i - description
 * @returns {*} - description
 */
function getSx(dir, x, i) {
  return adjustCoordinate({ dir, value: x, delta: i, axis: 'H' });
}

/**
 *
 * @param {*} dir - description
 * @param {*} y - description
 * @param {*} i - description
 * @returns {*} - description
 */
function getSy(dir, y, i) {
  return adjustCoordinate({ dir, value: y, delta: i, axis: 'V' });
}

/**
 *
 * @param {*} dir - description
 * @param {*} x - description
 * @param {*} len - description
 * @returns {*} - description
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
 *
 * @param {*} dir - description
 * @param {*} y - description
 * @param {*} len - description
 * @returns {*} - description
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
 *
 * @param {*} dir - description
 * @param {*} start - description
 * @param {*} len - description
 * @returns {*} - description
 */
function getEndCoord(dir, start, len) {
  return { x: getEndX(dir, start.x, len), y: getEndY(dir, start.y, len) };
}

// ─────────────────── Placement attempt (single pass) ─────────────────── //

/**
 *
 * @param {*} dir - description
 * @param {*} start - description
 * @param {*} occupied - description
 * @returns {*} - description
 */
function makeSegReducer(dir, start, occupied) {
  return (acc, _, i) =>
    handleSegment({ acc, placement: { dir, start } }, occupied, i);

  /**
   *
   * @param {*} segment - description
   * @param {*} occupied - description
   * @param {*} i - description
   * @returns {*} - description
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
   *
   * @param {*} segment - description
   * @param {*} occupied - description
   * @returns {*} - description
   */
  function getNextAccumulator(segment, occupied) {
    const { acc, sx, sy } = segment;
    if (isSegmentOccupied(occupied, sx, sy)) {
      return { ...acc, valid: false };
    }
    return addSegmentToAccumulator(acc, sx, sy);
  }

  /**
   *
   * @param {*} occupied - description
   * @param {*} sx - description
   * @param {*} sy - description
   * @returns {*} - description
   */
  function isSegmentOccupied(occupied, sx, sy) {
    const k = key(sx, sy);
    return occupied.has(k);
  }

  /**
   *
   * @param {*} acc - description
   * @param {*} sx - description
   * @param {*} sy - description
   * @returns {*} - description
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
 *
 * @param {*} cfg - description
 * @param {*} occupied - description
 * @param {*} segs - description
 * @returns {*} - description
 */
function isForbiddenTouch(cfg, occupied, segs) {
  return (
    cfg.noTouching === true &&
    !allSegsHaveNoOccupiedNeighbour(cfg, occupied, segs)
  );
}

/**
 *
 * @param {*} boardState - description
 * @param {*} segs - description
 * @param {*} valid - description
 * @returns {*} - description
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
 *
 * @param {*} root0 - description
 * @param {*} root0.start - description
 * @param {*} root0.length - description
 * @param {*} root0.cfg - description
 * @param {*} root0.occupied - description
 * @returns {*} - description
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
 *
 * @param {*} root0 - description
 * @param {*} root0.direction - description
 * @param {*} root0.start - description
 * @param {*} root0.length - description
 * @param {*} root0.cfg - description
 * @param {*} root0.occupied - description
 * @param {*} root0.candidates - description
 * @returns {*} - description
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
 *
 * @param {*} root0 - description
 * @param {*} root0.direction - description
 * @param {*} root0.start - description
 * @param {*} root0.length - description
 * @param {*} root0.cfg - description
 * @param {*} root0.occupied - description
 * @returns {*} - description
 */
function getCandidateIfInBounds({ direction, start, length, cfg, occupied }) {
  const endCoord = getEndCoord(direction, start, length);
  if (!inBounds(endCoord, cfg)) {
    return null;
  }
  return getValidCandidate({ direction, start, length, cfg, occupied });
}

/**
 *
 * @param {*} root0 - description
 * @param {*} root0.direction - description
 * @param {*} root0.start - description
 * @param {*} root0.length - description
 * @param {*} root0.cfg - description
 * @param {*} root0.occupied - description
 * @returns {*} - description
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
 *
 * @param {*} length - description
 * @param {*} cfg - description
 * @param {*} occupied - description
 * @returns {*} - description
 */
function collectAllCandidates(length, cfg, occupied) {
  const candidates = [];
  for (let y = 0; y < cfg.height; y++) {
    collectCandidatesForRow({ y, length, cfg, occupied, candidates });
  }
  return candidates;
}

/**
 *
 * @param {*} root0 - description
 * @param {*} root0.y - description
 * @param {*} root0.length - description
 * @param {*} root0.cfg - description
 * @param {*} root0.occupied - description
 * @param {*} root0.candidates - description
 * @returns {*} - description
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
 *
 * @param {*} chosen - description
 * @param {*} occupied - description
 * @param {*} length - description
 * @returns {*} - description
 */
function markOccupiedSquares(chosen, occupied, length) {
  for (let i = 0; i < length; i++) {
    const sx = getSx(chosen.direction, chosen.start.x, i);
    const sy = getSy(chosen.direction, chosen.start.y, i);
    occupied.add(key(sx, sy));
  }
}

/**
 *
 * @param {*} root0 - description
 * @param {*} root0.candidates - description
 * @param {*} root0.length - description
 * @param {*} env - description
 * @param {*} occupied - description
 * @returns {*} - description
 */
function chooseAndMarkCandidate({ candidates, length }, env, occupied) {
  if (candidates.length === 0) {
    return null;
  } // dead end
  const getRandomNumber = env.get('getRandomNumber');
  const chosen = candidates[Math.floor(getRandomNumber() * candidates.length)];
  // Mark occupied squares
  markOccupiedSquares(chosen, occupied, length);
  return chosen;
}

/**
 *
 * @param {*} length - description
 * @param {*} boardState - description
 * @param {*} env - description
 * @returns {*} - description
 */
function placeShip(length, boardState, env) {
  const { cfg, occupied } = boardState;
  const candidates = collectAllCandidates(length, cfg, occupied);
  return chooseAndMarkCandidate({ candidates, length }, env, occupied);
}

/**
 *
 * @param {*} cfg - description
 * @param {*} env - description
 * @returns {*} - description
 */
function makePlaceShip(cfg, env) {
  const occupied = new Set();
  return len => placeShip(len, { cfg, occupied }, env);
}

/**
 *
 * @param {*} acc - description
 * @param {*} placeShipWithArgs - description
 * @param {*} len - description
 * @returns {*} - description
 */
function shouldAbortPlaceShip(acc, placeShipWithArgs, len) {
  return !acc || !placeShipWithArgs(len);
}

/**
 *
 * @param {*} placeShipWithArgs - description
 * @returns {*} - description
 */
function makePlaceShipReducer(placeShipWithArgs) {
  return (acc, len) => {
    if (shouldAbortPlaceShip(acc, placeShipWithArgs, len)) {
      return null;
    }
    const placed = placeShipWithArgs(len);
    acc.push(placed);
    return acc;
  };
}

/**
 *
 * @param {*} cfg - description
 * @param {*} env - description
 * @returns {*} - description
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
 *
 * @param {*} cfg - description
 * @param {*} env - description
 * @returns {*} - description
 */
function attemptPlacement(cfg, env) {
  const ships = placeAllShips(cfg, env);
  if (!ships) {
    return null;
  }
  return { width: cfg.width, height: cfg.height, ships };
}

/**
 *
 * @param {*} cfg - description
 * @returns {*} - description
 */
function exceedsBoardArea(cfg) {
  const totalSegments = cfg.ships.reduce((s, l) => s + l, 0);
  return totalSegments > cfg.width * cfg.height;
}

/**
 *
 * @param {*} cfg - description
 * @returns {*} - description
 */
function ensureShipsArray(cfg) {
  if (!Array.isArray(cfg.ships)) {
    cfg.ships = [];
  }
}

// ─────────────────────────── Public toy ─────────────────────────── //

/**
 *
 * @param {*} input - description
 * @returns {*} - description
 */
function safeJsonParse(input) {
  try {
    return JSON.parse(input);
  } catch {
    return { width: 10, height: 10, ships: [] };
  }
}

/**
 *
 * @param {*} cfg - description
 * @returns {*} - description
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
 *
 * @param {*} value - description
 * @returns {*} - description
 */
function parseDimension(value) {
  if (typeof value === 'string') {
    return parseInt(value, 10);
  }
  return value;
}

/**
 *
 * @param {*} cfg - description
 * @returns {*} - description
 */
function parseDimensions(cfg) {
  cfg.width = parseDimension(cfg.width);
  cfg.height = parseDimension(cfg.height);
}

/**
 *
 * @param {*} input - description
 * @returns {*} - description
 */
function parseConfig(input) {
  const cfg = safeJsonParse(input);
  convertShipsToArray(cfg);
  parseDimensions(cfg);
  ensureShipsArray(cfg);
  return cfg;
}

/**
 *
 * @returns {*} - description
 */
function fleetAreaError() {
  return JSON.stringify({ error: 'Ship segments exceed board area' });
}

/**
 *
 * @returns {*} - description
 */
function fleetRetryError() {
  return JSON.stringify({
    error: 'Failed to generate fleet after max retries',
  });
}

/**
 *
 * @param {*} fleet - description
 * @returns {*} - description
 */
function maybeReturnFleet(fleet) {
  if (fleet !== null) {
    return fleet;
  }
  return null;
}

/**
 *
 * @param {*} i - description
 * @param {*} cfg - description
 * @param {*} env - description
 * @returns {*} - description
 */
function processFleetLoopIteration(i, cfg, env) {
  const fleet = attemptPlacement(cfg, env);
  const result = maybeReturnFleet(fleet);
  return result;
}

/**
 *
 * @param {*} maxTries - description
 * @param {*} cb - description
 * @returns {*} - description
 */
function fleetLoopFor(maxTries, cb) {
  return (
    Array.from({ length: maxTries }, (_, i) => cb(i)).find(
      result => result !== null
    ) || null
  );
}

/**
 *
 * @param {*} cfg - description
 * @param {*} env - description
 * @param {*} maxTries - description
 * @returns {*} - description
 */
function runFleetLoop(cfg, env, maxTries) {
  return fleetLoopFor(maxTries, i => processFleetLoopIteration(i, cfg, env));
}

/**
 *
 * @param {*} cfg - description
 * @param {*} env - description
 * @param {*} maxTries - description
 * @returns {*} - description
 */
function findValidFleet(cfg, env, maxTries) {
  return runFleetLoop(cfg, env, maxTries);
}

/**
 *
 * @param {*} cfg - description
 * @param {*} env - description
 * @param {*} maxTries - description
 * @returns {*} - description
 */
function tryGenerateFleet(cfg, env, maxTries) {
  const fleet = findValidFleet(cfg, env, maxTries);
  if (fleet !== null) {
    return JSON.stringify(fleet);
  }
  return null;
}

/**
 *
 * @param {*} input - description
 * @param {*} env - description
 * @returns {*} - description
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
 *
 * @param {*} cfg - description
 * @returns {*} - description
 */
function shouldReturnAreaError(cfg) {
  return exceedsBoardArea(cfg);
}

/**
 *
 * @param {*} fleetResult - description
 * @returns {*} - description
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
