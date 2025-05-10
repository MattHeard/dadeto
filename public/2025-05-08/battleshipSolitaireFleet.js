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
 */

// ────────────────────── Helper utilities ────────────────────── //

/** Fisher‑Yates shuffle (in‑place) using env RNG */
function shuffle(arr, env) {
  const getRandomNumber = env.get('getRandomNumber');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(getRandomNumber() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

const key = (x, y) => `${x},${y}`;

function isCoordNonNegative(coord) {
  return coord.x >= 0 && coord.y >= 0;
}

function isCoordWithinBoard(coord, cfg) {
  return coord.x < cfg.width && coord.y < cfg.height;
}

function inBounds(coord, cfg) {
  return isCoordNonNegative(coord) && isCoordWithinBoard(coord, cfg);
}

/** 8‑neighbour coordinates */
function isOrigin(dx, dy) {
  return dx === 0 && dy === 0;
}

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

function neighbours(coord) {
  return [-1, 0, 1].reduce((acc, dy) => {
    return acc.concat(
      [-1, 0, 1].reduce(dxReducerForNeighbour(coord, dy), [])
    );
  }, []);
}

function isNeighbourOccupied(n, cfg, occupied) {
  return inBounds(n, cfg) && occupied.has(key(n.x, n.y));
}

const makeSegHasNoOccupiedNeighbour = (cfg, occupied) => seg => !neighbours(seg).some(n => isNeighbourOccupied(n, cfg, occupied));

function getSx(dir, x, i) {
  if (dir === 'H') {
    return x + i;
  } else {
    return x;
  }
}

function getSy(dir, y, i) {
  if (dir === 'V') {
    return y + i;
  } else {
    return y;
  }
}

function getEndX(dir, x, len) {
  if (dir === 'H') {
    return x + len - 1;
  } else {
    return x;
  }
}

function getEndY(dir, y, len) {
  if (dir === 'V') {
    return y + len - 1;
  } else {
    return y;
  }
}

// ─────────────────── Placement attempt (single pass) ─────────────────── //

function placeShip(len, cfg, env, occupied) {
  const touchForbidden = cfg.noTouching === true;
  const candidates = [];
  for (let y = 0; y < cfg.height; y++) {
    for (let x = 0; x < cfg.width; x++) {
      for (const dir of ['H', 'V']) {
        const endX = getEndX(dir, x, len);
        const endY = getEndY(dir, y, len);
        if (!inBounds({x: endX, y: endY}, cfg)) {
          continue;
        }
        const { segs, valid } = Array.from({ length: len }).reduce(
          (acc, _, i) => {
            if (!acc.valid) {return acc;}
            const sx = getSx(dir, x, i);
            const sy = getSy(dir, y, i);
            const k = key(sx, sy);
            if (occupied.has(k)) {
              return { ...acc, valid: false };
            }
            return { ...acc, segs: [...acc.segs, { x: sx, y: sy }] };
          },
          { segs: [], valid: true }
        );
        const allSegsHaveNoOccupiedNeighbour = (cfg, occupied, segs) => {
          const segHasNoOccupiedNeighbour = makeSegHasNoOccupiedNeighbour(cfg, occupied);
          return segs.every(segHasNoOccupiedNeighbour);
        };

        if (valid) {
          const forbiddenTouch = touchForbidden && !allSegsHaveNoOccupiedNeighbour(cfg, occupied, segs);
          if (!forbiddenTouch) {
            candidates.push({ start: { x, y }, length: len, direction: dir });
          }
        }
      }
    }
  }
  if (candidates.length === 0) {return null;} // dead end
  const getRandomNumber = env.get('getRandomNumber');
  const chosen = candidates[Math.floor(getRandomNumber() * candidates.length)];
  // Mark occupied squares
  for (let i = 0; i < len; i++) {
    const sx = getSx(chosen.direction, chosen.start.x, i);
    const sy = getSy(chosen.direction, chosen.start.y, i);
    occupied.add(key(sx, sy));
  }
  return chosen;
}

function makePlaceShip(cfg, env) {
  const occupied = new Set();
  return len => placeShip(len, cfg, env, occupied);
}

function isValidFleetResult(result, lengths) {
  return result && result.length === lengths.length;
}

function makePlaceShipReducer(placeShipWithArgs) {
  return (acc, len) => {
    if (!acc) {return null;}
    const placed = placeShipWithArgs(len);
    if (!placed) {return null;}
    acc.push(placed);
    return acc;
  };
}

function placeAllShips(cfg, env) {
  const lengths = cfg.ships.slice();
  shuffle(lengths, env);
  const placeShipWithArgs = makePlaceShip(cfg, env);
  const placeShipReducer = makePlaceShipReducer(placeShipWithArgs);
  const result = lengths.reduce(placeShipReducer, []);
  if (isValidFleetResult(result, lengths)) {
    return result;
  } else {
    return null;
  }
}

function attemptPlacement(cfg, env) {
  const ships = placeAllShips(cfg, env);
  if (!ships) {return null;}
  return { width: cfg.width, height: cfg.height, ships };
}

// ─────────────────────────── Public toy ─────────────────────────── //

function generateFleet(input, env) {
  let cfg;
  try {
    cfg = JSON.parse(input);
  } catch (_) {
    cfg = {};
  }
  if (!Array.isArray(cfg.ships)) {
    cfg.ships = [];
  }


  const totalSegments = cfg.ships.reduce((s, l) => s + l, 0);
  if (totalSegments > cfg.width * cfg.height) {
    return JSON.stringify({ error: 'Ship segments exceed board area' });
  }

  const MAX_TRIES = 100;
  for (let i = 0; i < MAX_TRIES; i++) {
    const fleet = attemptPlacement(cfg, env);
    if (fleet) {return JSON.stringify(fleet);}
  }

  return JSON.stringify({ error: 'Failed to generate fleet after max retries' });
}

export { generateFleet };
