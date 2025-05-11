/*
 * Battleship Solitaire – Row/Column-Clue Generator
 * -----------------------------------------------
 * Toy signature:  generateClues(input: string, env: Env): string
 *   input : JSON string of a { width, height, ships } object
 *   env   : { getRandomNumber, getCurrentTime, getData, setData }  // (Unused but kept for parity)
 * Returns a JSON string of { rowClues: number[], colClues: number[] }  or { error }
 */

function generateClues(input, env) {
  let fleet;
  try {
    fleet = JSON.parse(input);
  } catch {
    return JSON.stringify({ error: 'Invalid input JSON' });
  }

  const { width, height, ships } = fleet;
  if (
    typeof width !== 'number' ||
      typeof height !== 'number' ||
      !Array.isArray(ships)
  ) {
    return JSON.stringify({ error: 'Invalid fleet structure' });
  }

  const rowClues = Array(height).fill(0);
  const colClues = Array(width).fill(0);

  for (const ship of ships) {
    const cells = getShipCells(ship);
    for (const [x, y] of cells) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        rowClues[y] += 1;
        colClues[x] += 1;
      }
    }
  }

  return JSON.stringify({ rowClues, colClues });
}

function getShipCells(ship) {
  const cells = [];
  const { start, length, direction } = ship;
  for (let i = 0; i < length; i++) {
    let x;
    let y;
    if (direction === 'H') {
      x = start.x + i;
      y = start.y;
    } else {
      x = start.x;
      y = start.y + i;
    }
    cells.push([x, y]);
  }
  return cells;
}

export { generateClues };