import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const baseline =
  process.argv.slice(2).find(argument => !argument.startsWith('--')) ??
  'bde25b950cf237a1e0b65a4e4a6d2e7ef0f8e2b1';
assert.match(baseline, /^[a-f0-9]{40}$/);
const source = execFileSync(
  'git',
  ['show', `${baseline}:src/core/wgs84/wgs84.js`],
  { encoding: 'utf8' }
);
if (process.argv.includes('--source')) {
  process.stdout.write(source);
  process.exit(0);
}
const encode = value => (Object.is(value, -0) ? '-0' : String(value));
const inputs = [];
for (const a of [-90, 0, 45, 90])
  for (const b of [-180, 0, 1, 180])
    for (const c of [-90, 0, 45, 90])
      for (const d of [-180, 0, 1, 180]) inputs.push([a, b, c, d]);
for (let index = 0; index < 128; index += 1)
  inputs.push([
    ((index * 73) % 18001) / 100 - 90,
    ((index * 127) % 36001) / 100 - 180,
    ((index * 181) % 18001) / 100 - 90,
    ((index * 251) % 36001) / 100 - 180,
  ]);
for (const value of [
  NaN,
  Infinity,
  -Infinity,
  Number.MIN_VALUE,
  Number.MAX_VALUE,
])
  for (let index = 0; index < 4; index += 1) {
    const coordinates = [10, 20, -15, 80];
    coordinates[index] = value;
    inputs.push(coordinates);
  }
const cases = inputs.map(coordinates => ({
  coordinates: coordinates.map(encode),
}));
console.log(
  JSON.stringify(
    {
      baseline,
      sourceSha256: createHash('sha256').update(source).digest('hex'),
      cases,
    },
    null,
    2
  )
);
