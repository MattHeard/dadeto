import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { describe, it, expect } from '@jest/globals';

async function loadValidateCluesObject() {
  const srcPath = path.join(process.cwd(), 'src/presenters/battleshipSolitaireClues.js');
  let src = fs.readFileSync(srcPath, 'utf8');
  src = src.replace(/from '((?:\.\.?\/).*?)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(srcPath), p));
    return `from '${abs.href}'`;
  });
  src += '\nexport { validateCluesObject };';
  return (
    await import(`data:text/javascript,${encodeURIComponent(src)}`)
  ).validateCluesObject;
}

describe('validateCluesObject dynamic import', () => {
  it('returns Invalid JSON object when input is not an object', async () => {
    const validateCluesObject = await loadValidateCluesObject();
    expect(validateCluesObject(42)).toBe('Invalid JSON object');
  });
});
