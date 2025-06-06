import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let validateCluesObject;

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
  ({ validateCluesObject } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('validateCluesObject', () => {
  test('returns error when input is not an object', () => {
    const result = validateCluesObject(42);
    expect(result).toBe('Invalid JSON object');
  });
});
