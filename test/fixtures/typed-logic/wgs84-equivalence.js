import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const baseline = process.argv[2] ?? 'bde25b950cf237a1e0b65a4e4a6d2e7ef0f8e2b1';
assert.match(baseline, /^[a-f0-9]{40}$/);
const originalPath = 'src/core/wgs84/wgs84.js';
const source = spawnSync('git', ['show', `${baseline}:${originalPath}`], {
  encoding: 'utf8',
});
assert.equal(source.status, 0, source.stderr);
const originalMath = await import(
  `data:text/javascript;base64,${Buffer.from(source.stdout).toString('base64')}`
);
const originalPublic = spawnSync(
  'git',
  ['show', `${baseline}:src/core/wgs84/index.js`],
  { encoding: 'utf8' }
);
assert.equal(originalPublic.status, 0, originalPublic.stderr);
const mathUrl = `data:text/javascript;base64,${Buffer.from(source.stdout).toString('base64')}`;
const original = await import(
  `data:text/javascript;base64,${Buffer.from(originalPublic.stdout.replaceAll('./wgs84.js', mathUrl)).toString('base64')}`
);
const current = await import(
  new URL(process.argv[3] ?? '../../../src/adapters/wgs84.js', import.meta.url)
);
const currentMath = await import(
  new URL(
    process.argv[4] ?? '../../../src/logic/core/wgs84/wgs84.js',
    import.meta.url
  )
);
const hash = createHash('sha256');
let cases = 0;

/**
 * Preserve non-finite values and negative zero in the evidence digest.
 * @param {number} value Computation result.
 * @returns {string} Lossless numeric representation.
 */
function encodeNumber(value) {
  return Object.is(value, -0) ? '-0' : String(value);
}

/**
 * Compare exact numeric results rather than hiding changes in a tolerance.
 * @param {number[]} coordinates Latitude/longitude pairs.
 * @returns {void}
 */
function compareCoordinates(coordinates) {
  for (const name of ['calculateWgs84SurfaceDistance', 'spherical']) {
    const expected = originalMath[name](...coordinates);
    const actual = currentMath[name](...coordinates);
    assert.ok(Object.is(actual, expected), `${name}: ${coordinates}`);
    hash.update(
      JSON.stringify([
        name,
        coordinates.map(encodeNumber),
        encodeNumber(expected),
      ])
    );
    cases += 1;
  }
  const expected = original.wgs84Distance(...coordinates);
  assert.ok(Object.is(current.wgs84Distance(...coordinates), expected));
  hash.update(encodeNumber(expected));
  cases += 1;
}

const latitudes = [-90, -89.9, -45, -0, 0, 45, 89.9, 90];
const longitudes = [-180, -179.9, -1, -0, 0, 1, 179.9, 180];
for (const latitude1 of latitudes)
  for (const longitude1 of longitudes)
    for (const latitude2 of latitudes)
      for (const longitude2 of longitudes)
        compareCoordinates([latitude1, longitude1, latitude2, longitude2]);
for (let index = 0; index < 4096; index += 1)
  compareCoordinates([
    ((index * 73) % 18001) / 100 - 90,
    ((index * 127) % 36001) / 100 - 180,
    ((index * 181) % 18001) / 100 - 90,
    ((index * 251) % 36001) / 100 - 180,
  ]);
compareCoordinates([16, 0, -15.5, 179.48]);
for (const value of [
  NaN,
  Infinity,
  -Infinity,
  Number.MIN_VALUE,
  Number.MAX_VALUE,
])
  for (let position = 0; position < 4; position += 1) {
    const coordinates = [10, 20, -15, 80];
    coordinates[position] = value;
    compareCoordinates(coordinates);
  }
for (const degrees of [
  -Infinity,
  -360,
  -180,
  -0,
  0,
  1,
  90,
  180,
  360,
  Infinity,
  NaN,
]) {
  const expected = originalMath.degreesToRadians(degrees);
  assert.ok(Object.is(currentMath.degreesToRadians(degrees), expected));
  hash.update(encodeNumber(expected));
  cases += 1;
}

/**
 * Capture coercion order, exact special-number results and original errors.
 * @param {Function} calculate Public distance implementation.
 * @param {number[]} kinds Input factory indices.
 * @returns {object} Observable outcome including ordered coercion events.
 */
function publicOutcome(calculate, kinds) {
  const trace = [];
  const factories = [
    () => undefined,
    () => null,
    () => true,
    () => false,
    () => '',
    () => '  ',
    () => '12.5',
    () => 'invalid',
    () => 2n,
    () => Symbol('coordinate'),
    () => [],
    () => ['2'],
    position => ({
      valueOf: () => {
        trace.push(position);
        return 2;
      },
    }),
    position => ({
      [Symbol.toPrimitive]: hint => {
        trace.push([position, hint]);
        return '3';
      },
    }),
    position => ({
      valueOf: () => {
        trace.push(position);
        throw new Error('coordinate failure');
      },
    }),
  ];
  const args = kinds.map((kind, position) =>
    kind < 0 ? position + 1 : factories[kind](position)
  );
  try {
    return { result: encodeNumber(calculate(...args)), trace };
  } catch (error) {
    return { error: [error.name, error.message], trace };
  }
}
for (let kind = 0; kind < 15; kind += 1)
  for (let position = 0; position < 4; position += 1) {
    const kinds = [-1, -1, -1, -1];
    kinds[position] = kind;
    const expected = publicOutcome(original.wgs84Distance, kinds);
    assert.deepEqual(publicOutcome(current.wgs84Distance, kinds), expected);
    hash.update(JSON.stringify([kinds, expected]));
    cases += 1;
  }
for (const kinds of [
  [12, 13, 12, 13],
  [9, 12, 13, 14],
  [12, 14, 13, 12],
  [12, 13, 9, 14],
]) {
  const expected = publicOutcome(original.wgs84Distance, kinds);
  assert.deepEqual(publicOutcome(current.wgs84Distance, kinds), expected);
  hash.update(JSON.stringify([kinds, expected]));
  cases += 1;
}
console.log(
  JSON.stringify(
    {
      baseline,
      baselineMathSha256: createHash('sha256')
        .update(source.stdout)
        .digest('hex'),
      baselinePublicSha256: createHash('sha256')
        .update(originalPublic.stdout)
        .digest('hex'),
      cases,
      sha256: hash.digest('hex'),
    },
    null,
    2
  )
);
