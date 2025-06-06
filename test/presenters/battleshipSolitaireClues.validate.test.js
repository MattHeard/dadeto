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
});
