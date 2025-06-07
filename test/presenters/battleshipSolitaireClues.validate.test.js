import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { describe, test, expect } from '@jest/globals';

async function loadValidateCluesObject() {
  const presenterPath = path.join(
    process.cwd(),
    'src/presenters/battleshipSolitaireClues.js'
  );
  let src = fs.readFileSync(presenterPath, 'utf8');
  src = src.replace(/from '\.\/(.*?)'/g, (_, p) => {
    const absolute = pathToFileURL(path.join(path.dirname(presenterPath), p));
    return `from '${absolute.href}'`;
  });
  src += '\nexport { validateCluesObject };';
  return (
    await import(`data:text/javascript,${encodeURIComponent(src)}`)
  ).validateCluesObject;
}

describe('validateCluesObject', () => {
  test('returns error when input is not an object', async () => {
    const validateCluesObject = await loadValidateCluesObject();
    const result = validateCluesObject(42);
    expect(result).toBe('Invalid JSON object');
  });

  test('returns error when rowClues or colClues arrays are missing', async () => {
    const validateCluesObject = await loadValidateCluesObject();
    const result = validateCluesObject({ rowClues: [1, 2, 3] });
    expect(result).toBe('Missing rowClues or colClues array');
  });

  test('returns error when clue values are non-numeric', async () => {
    const validateCluesObject = await loadValidateCluesObject();
    const result = validateCluesObject({ rowClues: [1, 'x'], colClues: [2, 3] });
    expect(result).toBe('Clue values must be numbers');
  });

  test('returns error when any array is empty', async () => {
    const validateCluesObject = await loadValidateCluesObject();
    const result = validateCluesObject({ rowClues: [], colClues: [] });
    expect(result).toBe('rowClues and colClues must be non-empty');
  });
});
