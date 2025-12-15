import fs from 'fs';
import path from 'path';
import { describe, test, expect } from '@jest/globals';

import { rewriteRelativeImports } from '../../helpers/resolveRelativeImports.js';

/**
 * Dynamically imports the ticTacToe module and returns its minimax export.
 * @returns {Promise<Function>} Resolves with the minimax function.
 */
async function loadMinimax() {
  const filePath = path.join(
    process.cwd(),
    'src/core/browser/toys/2025-04-06/ticTacToe.js'
  );
  const helperSource = `
function safeParseJson(json, parseJsonValue) {
  try {
    return parseJsonValue(json);
  } catch {
    return undefined;
  }
}

function valueOr(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  return value;
}

function parseJsonOrFallback(json, fallback = null) {
  return valueOr(safeParseJson(json, JSON.parse), fallback);
}
`;
  const parserImport =
    "import { parseJsonOrFallback } from '../browserToysCore.js';\n";
  const src = fs.readFileSync(filePath, 'utf8');
  const cleanedSource = src.replace(parserImport, '');
  const rewrittenSource = rewriteRelativeImports(cleanedSource, filePath);
  const combined = `${helperSource}\n${rewrittenSource}\nexport { minimax };`;
  const mod = await import(
    `data:text/javascript,${encodeURIComponent(combined)}`
  );
  return mod.minimax;
}

describe('minimax early return', () => {
  test('returns terminal score when player has already won', async () => {
    const minimax = await loadMinimax();
    const board = [
      ['X', 'X', 'X'],
      [null, null, null],
      [null, null, null],
    ];
    const params = { board, player: 'X', moves: [] };
    const score = minimax(0, true, params);
    expect(score).toBe(10);
  });
});
