import { expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createContext, SourceTextModule } from 'node:vm';
import {
  calculateWgs84SurfaceDistance,
  spherical,
  degreesToRadians,
  calculateLongitudeStep,
  hasLongitudeConverged,
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
  expect(oracle.cases).toHaveLength(405);
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

it('recognizes coincident geometry before preparing a singular arc', () => {
  expect(calculateLongitudeStep(0, 0, 0, 0)).toEqual({ kind: 'coincident' });
  const outcome = calculateLongitudeStep(0.1, 0, 0, 0.1);
  expect(outcome.kind).toBe('iteration');
  expect(outcome.arc.sinSigma).toBeGreaterThan(0);
  expect(Number.isFinite(outcome.arc.next)).toBe(true);
});

it('preserves the strict convergence boundary and non-finite policy', () => {
  expect(hasLongitudeConverged(0, 1e-12)).toBe(false);
  expect(hasLongitudeConverged(0, -1e-12)).toBe(false);
  expect(hasLongitudeConverged(0, 1e-13)).toBe(true);
  expect(hasLongitudeConverged(2, 2)).toBe(true);
  expect(hasLongitudeConverged(2, 3)).toBe(false);
  expect(hasLongitudeConverged(NaN, 0)).toBe(false);
  expect(hasLongitudeConverged(Infinity, Infinity)).toBe(false);
});

it('uses the original spherical fallback at the hundred-iteration boundary', () => {
  const coordinates = [16, 0, -15.5, 179.48];
  expect(calculateWgs84SurfaceDistance(...coordinates)).toBe(
    original.calculateWgs84SurfaceDistance(...coordinates)
  );
  expect(calculateWgs84SurfaceDistance(...coordinates)).toBe(
    original.spherical(...coordinates)
  );
});
