import { expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createContext, SourceTextModule } from 'node:vm';
import {
  calculateWgs84SurfaceDistance,
  spherical,
  degreesToRadians,
} from '../../../../src/logic/core/wgs84/wgs84.js';

const oracle = JSON.parse(
  readFileSync(
    new URL(
      '../../../fixtures/typed-logic/wgs84-numeric-baseline.json',
      import.meta.url
    ),
    'utf8'
  )
);

const originalSource = readFileSync(
  new URL(
    '../../../fixtures/typed-logic/wgs84-math-baseline.js.txt',
    import.meta.url
  ),
  'utf8'
);
const originalModule = new SourceTextModule(originalSource, {
  context: createContext({}),
});
await originalModule.link(() => {
  throw new Error('Immutable WGS84 oracle must remain import-free.');
});
await originalModule.evaluate();
const original = originalModule.namespace;

it('preserves exact independent pre-migration numerical outcomes', () => {
  expect(oracle.baseline).toBe('bde25b950cf237a1e0b65a4e4a6d2e7ef0f8e2b1');
  expect(oracle.sourceSha256).toBe(
    '6cda895a0da07966efca249646611f07b473e2e0ad6697ee0f485f660548988f'
  );
  expect(createHash('sha256').update(originalSource).digest('hex')).toBe(
    oracle.sourceSha256
  );
  expect(oracle.cases).toHaveLength(404);
  for (const sample of oracle.cases) {
    const coordinates = sample.coordinates.map(value => Number(value));
    expect({
      coordinates: sample.coordinates,
      distance: calculateWgs84SurfaceDistance(...coordinates),
    }).toEqual({
      coordinates: sample.coordinates,
      distance: original.calculateWgs84SurfaceDistance(...coordinates),
    });
    expect({
      coordinates: sample.coordinates,
      distance: spherical(...coordinates),
    }).toEqual({
      coordinates: sample.coordinates,
      distance: original.spherical(...coordinates),
    });
  }
});

it('preserves radians including negative zero and non-finite inputs', () => {
  expect(degreesToRadians(180)).toBe(Math.PI);
  expect(Object.is(degreesToRadians(-0), -0)).toBe(true);
  expect(degreesToRadians(Infinity)).toBe(Infinity);
  expect(degreesToRadians(NaN)).toBeNaN();
});
