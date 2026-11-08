import assert from 'node:assert/strict';

const root = await import('../../../public/core/wgs84.js');
const index = await import('../../../public/core/wgs84/index.js');
const math = await import('../../../public/core/wgs84/wgs84.js');
const toy = await import(
  '../../../public/core/browser/toys/2026-08-20/wgs84Distance.js'
);
const coordinates = [0, 0, 0, 1];
const distance = 111319.4907932264;
assert.equal(root.wgs84Distance(...coordinates), distance);
assert.equal(toy.wgs84Distance(...coordinates), distance);
assert.equal(toy.wgs84Distance('0', '0', '0', '1'), distance);
assert.equal(index.wgs84Distance(...coordinates), distance);
assert.equal(root.wgs84Distance('0', '0', '0', '1'), distance);
assert.equal(math.calculateWgs84SurfaceDistance(...coordinates), distance);
assert.equal(math.degreesToRadians(180), Math.PI);
assert.equal(root.spherical(...coordinates), math.spherical(...coordinates));
assert.equal(index.spherical(...coordinates), math.spherical(...coordinates));
console.log(
  'All four stable WGS84 browser module paths resolve and preserve their public APIs.'
);
