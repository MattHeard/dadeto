import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('./wgs84-math-baseline.js.txt', import.meta.url),
  'utf8'
);
assert.equal(
  createHash('sha256').update(source).digest('hex'),
  '6cda895a0da07966efca249646611f07b473e2e0ad6697ee0f485f660548988f'
);
const load = text =>
  import(`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`);
const coordinates = [16, 0, -15.5, 179.48];
const original = await load(source);
for (const token of [
  'i < 100',
  'i === 99',
  '    if (Math.abs(next - lambda) < 1e-12)',
])
  assert.ok(source.includes(token));
const instrumented = source
  .replace('i < 100', 'i < 1000')
  .replace('i === 99', 'i === 999')
  .replace(
    '    if (Math.abs(next - lambda) < 1e-12)',
    '    globalThis.__wgs84Probe.push([i + 1, Math.abs(next - lambda)]);\n    if (Math.abs(next - lambda) < 1e-12)'
  );
globalThis.__wgs84Probe = [];
const probe = await load(instrumented);
const extended = probe.calculateWgs84SurfaceDistance(...coordinates);
console.log(
  JSON.stringify(
    {
      coordinates,
      original: original.calculateWgs84SurfaceDistance(...coordinates),
      spherical: original.spherical(...coordinates),
      extended,
      finalIterations: globalThis.__wgs84Probe.slice(-3),
    },
    null,
    2
  )
);
