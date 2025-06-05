import { describe, test, expect } from '@jest/globals';
import { readFileSync, writeFileSync, promises as fsPromises } from 'fs';
import { join, dirname } from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
const filePath = require.resolve(
  '../../../src/toys/2025-05-08/battleshipSolitaireFleet.js'
);

async function loadFleetLoopFor() {
  const code = readFileSync(filePath, 'utf8');
  const tempPath = join(dirname(filePath), `fleetLoopFor.${Date.now()}.js`);
  writeFileSync(
    tempPath,
    `${code}\nexport { fleetLoopFor };\n//# sourceURL=${filePath}`
  );
  const mod = await import(`${pathToFileURL(tempPath).href}`);
  await fsPromises.unlink(tempPath);
  return mod.fleetLoopFor;
}

describe('fleetLoopFor', () => {
  test('returns first non-null result', async () => {
    const fleetLoopFor = await loadFleetLoopFor();
    const results = [null, 'success'];
    const cb = i => results[i];
    const result = fleetLoopFor(2, cb);
    expect(result).toBe('success');
  });
});
