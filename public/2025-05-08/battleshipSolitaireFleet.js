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

function inBounds(x, y, w, h) {
  return x >= 0 && y >= 0 && x < w && y < h;
}

/** 8‑neighbour coordinates */
function neighbours(x, y) {
  const out = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) {continue;}
      out.push({ x: x + dx, y: y + dy });
    }
  }
  return out;
}

// ─────────────────── Placement attempt (single pass) ─────────────────── //

function attemptPlacement(cfg, env) {
  const occupied = new Set();
  const touchForbidden = cfg.noTouching === true;
  const ships = [];

  // Work on a shuffled copy to reduce bias
  const lengths = cfg.ships.slice();
  shuffle(lengths, env);

  for (const len of lengths) {
    const candidates = [];

    for (let y = 0; y < cfg.height; y++) {
      for (let x = 0; x < cfg.width; x++) {
        for (const dir of ['H', 'V']) {
          const endX = dir === 'H' ? x + len - 1 : x;
          const endY = dir === 'V' ? y + len - 1 : y;
          if (!inBounds(endX, endY, cfg.width, cfg.height)) {continue;}

          let valid = true;
          const segs = [];
          for (let i = 0; i < len && valid; i++) {
            const sx = dir === 'H' ? x + i : x;
            const sy = dir === 'V' ? y + i : y;
            const k = key(sx, sy);
            if (occupied.has(k)) {valid = false;}
            segs.push({ x: sx, y: sy });
          }
          if (!valid) {continue;}

          if (touchForbidden) {
            for (const { x: sx, y: sy } of segs) {
              for (const n of neighbours(sx, sy)) {
                if (inBounds(n.x, n.y, cfg.width, cfg.height) && occupied.has(key(n.x, n.y))) {
                  valid = false;
                  break;
                }
              }
              if (!valid) {break;}
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
    ships.push(chosen);

    // Mark occupied squares
    for (let i = 0; i < len; i++) {
      const sx = chosen.direction === 'H' ? chosen.start.x + i : chosen.start.x;
      const sy = chosen.direction === 'V' ? chosen.start.y + i : chosen.start.y;
      occupied.add(key(sx, sy));
    }
  }

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
