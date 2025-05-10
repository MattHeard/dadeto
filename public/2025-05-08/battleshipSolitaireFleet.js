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

function inBounds(coord, cfg) {
  return coord.x >= 0 && coord.y >= 0 && coord.x < cfg.width && coord.y < cfg.height;
}

/** 8‑neighbour coordinates */
function neighbours(coord) {
  const out = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) {continue;}
      out.push({ x: coord.x + dx, y: coord.y + dy });
    }
  }
  return out;
}

function isNeighbourOccupied(n, cfg, occupied) {
  return inBounds(n, cfg) && occupied.has(key(n.x, n.y));
}

// ─────────────────── Placement attempt (single pass) ─────────────────── //

function placeShipForLength(len, cfg, env, occupied, touchForbidden) {
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
          for (const seg of segs) {
            const foundOccupied = neighbours(seg).find(isNeighbourOfSegOccupied);
            if (foundOccupied) {
              valid = false;
            }
            if (!valid) {
              break;
            }
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

function placeAllShips(cfg, env, occupied, touchForbidden) {
  const lengths = cfg.ships.slice();
  shuffle(lengths, env);
  // Closure: captures cfg, env, occupied, touchForbidden
  const placeShip = len => placeShipForLength(len, cfg, env, occupied, touchForbidden);
  const placeShipReducer = (acc, len) => {
    if (!acc) return null;
    const placed = placeShip(len);
    if (!placed) return null;
    acc.push(placed);
    return acc;
  };
  const result = lengths.reduce(placeShipReducer, []);
  return result && result.length === lengths.length ? result : null;
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
