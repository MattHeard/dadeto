import { expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
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

it('preserves exact independent pre-migration numerical outcomes', () => {
  expect(oracle.baseline).toBe('bde25b950cf237a1e0b65a4e4a6d2e7ef0f8e2b1');
  expect(oracle.sourceSha256).toBe(
    '6cda895a0da07966efca249646611f07b473e2e0ad6697ee0f485f660548988f'
  );
  expect(oracle.cases).toHaveLength(404);
  for (const sample of oracle.cases) {
    const coordinates = sample.coordinates.map(value => Number(value));
    expect(
      Object.is(
        calculateWgs84SurfaceDistance(...coordinates),
        Number(sample.ellipsoid)
      )
    ).toBe(true);
    expect(Object.is(spherical(...coordinates), Number(sample.spherical))).toBe(
      true
    );
  }
});

it('preserves radians including negative zero and non-finite inputs', () => {
  expect(degreesToRadians(180)).toBe(Math.PI);
  expect(Object.is(degreesToRadians(-0), -0)).toBe(true);
  expect(degreesToRadians(Infinity)).toBe(Infinity);
  expect(degreesToRadians(NaN)).toBeNaN();
});
