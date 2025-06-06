import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { beforeAll, afterAll, describe, test, expect } from '@jest/globals';

let validateCluesObject;
let tempFile;

beforeAll(async () => {
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
  const dir = path.dirname(fileURLToPath(import.meta.url));
  tempFile = path.join(dir, 'tmp.validateClues.mjs');
  fs.writeFileSync(tempFile, src);
  ({ validateCluesObject } = await import(pathToFileURL(tempFile).href));
});

afterAll(() => {
  if (tempFile) {
    fs.unlinkSync(tempFile);
  }
});

describe('validateCluesObject', () => {
  test('returns error when input is not an object', () => {
    const result = validateCluesObject(42);
    expect(result).toBe('Invalid JSON object');
  });

  test('returns error when rowClues or colClues are missing', () => {
    const result = validateCluesObject({ rowClues: [1, 2, 3] });
    expect(result).toBe('Missing rowClues or colClues array');
  });

  test('returns error when clue values are non-numeric', () => {
    const result = validateCluesObject({
      rowClues: [1, 'x'],
      colClues: [2, 3],
    });
    expect(result).toBe('Clue values must be numbers');
  });

  test('returns error when any clue array is empty', () => {
    const result = validateCluesObject({ rowClues: [], colClues: [1] });
    expect(result).toBe('rowClues and colClues must be non-empty');
  });

  test('returns empty string for valid clues object', () => {
    const result = validateCluesObject({ rowClues: [1, 2], colClues: [3, 4] });
    expect(result).toBe('');
  });
});
