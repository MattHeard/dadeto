import { readFileSync } from 'node:fs';
import { expect, it } from '@jest/globals';
import { createCopyCloudHandle } from '../../src/core/build/copy-cloud.js';
import {
  observeCloudCopyEffects,
  summarizeCloudCopyEffects,
} from '../fixtures/typed-logic/cloud-copy-effects.js';

const baseline = JSON.parse(
  readFileSync(
    new URL(
      '../fixtures/typed-logic/cloud-copy-baseline.json',
      import.meta.url
    ),
    'utf8'
  )
);
const destination =
  '/reference/infra/cloud-functions/object-minute-rental-search/';
const wgs84Copies = [
  ['/reference/src/adapters/wgs84.js', `${destination}adapters/wgs84.js`],
  [
    '/reference/src/logic/boundary/wgs84/coordinates.js',
    `${destination}logic/boundary/wgs84/coordinates.js`,
  ],
  [
    '/reference/src/logic/core/wgs84/wgs84.js',
    `${destination}logic/core/wgs84/wgs84.js`,
  ],
  [
    '/reference/src/build/assets/wgs84/root.js.txt',
    `${destination}core/wgs84.js`,
  ],
  [
    '/reference/src/build/assets/wgs84/index.js.txt',
    `${destination}core/wgs84/index.js`,
  ],
  [
    '/reference/src/build/assets/wgs84/math.js.txt',
    `${destination}core/wgs84/wgs84.js`,
  ],
  [
    '/reference/src/build/assets/wgs84/toy.js.txt',
    `${destination}core/browser/toys/2026-08-20/wgs84Distance.js`,
  ],
];

it.each([0, 1])(
  'preserves the complete immutable deployment effects with only the explicit WGS84 delta, scenario %s',
  async index => {
    expect(baseline.baseline).toBe('bde25b950cf237a1e0b65a4e4a6d2e7ef0f8e2b1');
    expect(baseline.sourceSha256).toBe(
      'a650a9920470dd785a1d7d6fd4f4ad64eb51603225303aa82a455f2d21c9ede2'
    );
    const scenario = baseline.scenarios[index];
    const effects = await observeCloudCopyEffects(
      createCopyCloudHandle,
      scenario.payload
    );
    expect(effects.copies.slice(-7)).toEqual(wgs84Copies);
    const normalized = {
      ...effects,
      copies: [...effects.copies.slice(0, -7), ...baseline.legacyWgs84Copies],
    };
    expect(summarizeCloudCopyEffects(normalized)).toEqual(scenario.effects);
  }
);
