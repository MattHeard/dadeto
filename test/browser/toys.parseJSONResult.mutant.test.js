import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

async function loadParseJSONResult() {
  const srcPath = path.join(process.cwd(), 'src/browser/toys.js');
  let src = fs.readFileSync(srcPath, 'utf8');
  src = src.replace(/from '((?:\.\.?\/).*?)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(srcPath), p));
    return `from '${abs.href}'`;
  });
  src += '\nexport { parseJSONResult };';
  return (await import(`data:text/javascript,${encodeURIComponent(src)}`))
    .parseJSONResult;
}

describe('parseJSONResult mutant', () => {
  it('returns null when JSON parsing fails', async () => {
    const parseJSONResult = await loadParseJSONResult();
    expect(parseJSONResult('not json')).toBeNull();
  });
});
