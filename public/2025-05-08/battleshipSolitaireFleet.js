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
function dxReducerForNeighbour(coord, dy) {
  return (row, dx) => {
    if (dx === 0 && dy === 0) { return row; }
    const neighbour = { x: coord.x + dx, y: coord.y + dy };
    return row.concat(neighbour);
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

function makeCheckSegForNeighbourOccupied(isNeighbourOfSegOccupied) {
  return seg => {
    const foundOccupied = neighbours(seg).find(isNeighbourOfSegOccupied);
    return Boolean(foundOccupied);
  };
}

// ─────────────────── Placement attempt (single pass) ─────────────────── //


function placeShip(len, cfg, env, occupied, touchForbidden) {
  const candidates = [];
  for (let y = 0; y < cfg.height; y++) {
    for (let x = 0; x < cfg.width; x++) {
      for (const dir of ['H', 'V']) {
        let endX, endY;
        if (dir === 'H') {
          endX = x + len - 1;
        } else {
          endX = x;
        }
        if (dir === 'V') {
          endY = y + len - 1;
        } else {
          endY = y;
        }
        if (!inBounds({x: endX, y: endY}, cfg)) {
          continue;
        }
        let valid = true;
        const segs = [];
        for (let i = 0; i < len && valid; i++) {
          let sx, sy;
          if (dir === 'H') {
            sx = x + i;
          } else {
            sx = x;
          }
          if (dir === 'V') {
            sy = y + i;
          } else {
            sy = y;
          }
          const k = key(sx, sy);
          if (occupied.has(k)) {
            valid = false;
          }
          segs.push({ x: sx, y: sy });
        }
        if (!valid) {
          continue;
        }
        if (touchForbidden) {
          const isNeighbourOfSegOccupied = n => isNeighbourOccupied(n, cfg, occupied);
          const segHasNoOccupiedNeighbour = seg => !neighbours(seg).some(isNeighbourOfSegOccupied);
          if (!segs.every(segHasNoOccupiedNeighbour)) {
            valid = false;
          }
        }
        if (valid) {
          candidates.push({ start: { x, y }, length: len, direction: dir });
        }
      }
    }
  }
  if (candidates.length === 0) {return null;} // dead end
  const getRandomNumber = env.get('getRandomNumber');
  const chosen = candidates[Math.floor(getRandomNumber() * candidates.length)];
  // Mark occupied squares
  for (let i = 0; i < len; i++) {
    let sx, sy;
    if (chosen.direction === 'H') {
      sx = chosen.start.x + i;
    } else {
      sx = chosen.start.x;
    }
    if (chosen.direction === 'V') {
      sy = chosen.start.y + i;
    } else {
      sy = chosen.start.y;
    }
    occupied.add(key(sx, sy));
  }
  return chosen;
}

function makePlaceShip(cfg, env, occupied, touchForbidden) {
  return len => placeShip(len, cfg, env, occupied, touchForbidden);
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

function placeAllShips(cfg, env, occupied, touchForbidden) {
  const lengths = cfg.ships.slice();
  shuffle(lengths, env);
  const placeShipWithArgs = makePlaceShip(cfg, env, occupied, touchForbidden);
  const placeShipReducer = makePlaceShipReducer(placeShipWithArgs);
  const result = lengths.reduce(placeShipReducer, []);
  if (isValidFleetResult(result, lengths)) {
    return result;
  } else {
    return null;
  }
}

function attemptPlacement(cfg, env) {
  const occupied = new Set();
  const touchForbidden = cfg.noTouching === true;
  const ships = placeAllShips(cfg, env, occupied, touchForbidden);
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
