import { readFileSync } from 'node:fs';
import path from 'node:path';
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
const heatPumpAssets = JSON.parse(
  readFileSync(
    new URL('../fixtures/typed-logic/heat-pump-assets.json', import.meta.url),
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

it.each([0, 1, 2])(
  'preserves the complete immutable deployment effects with only the explicit WGS84 and heat-pump deltas, scenario %s',
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
    const heatPumpCopies = heatPumpAssets.map(([source, target]) => [
      `/reference/src/${source}`,
      `${destination}${target}`,
    ]);
    expect(effects.copies.slice(-7 - heatPumpCopies.length, -7)).toEqual(
      heatPumpCopies
    );
    const normalized = {
      ...effects,
      copies: [
        ...effects.copies.slice(0, -7 - heatPumpCopies.length),
        ...baseline.legacyWgs84Copies,
      ],
    };
    expect(summarizeCloudCopyEffects(normalized)).toEqual(scenario.effects);
  }
);

it('propagates a final-batch rewrite failure while continuing to ignore absent files', async () => {
  // Use the final planned file so malformed paths fail before injecting I/O faults.
  const target =
    '/repo/infra/cloud-functions/object-minute-rental-search/firestore.js';
  const failure = Object.assign(new Error('isolated batch read failure'), {
    code: 'EACCES',
  });
  const run = error =>
    createCopyCloudHandle({
      fileURLToPathFn: () => '/repo/src/core/build/copy-cloud.js',
      dirnameFn: path.posix.dirname,
      pathModule: path.posix,
      fsPromisesModule: {
        readdir: async () => [],
        mkdir: async () => undefined,
        copyFile: async () => undefined,
        writeFile: async () => undefined,
        readFile: async file => {
          if (file === target) throw error;
          return '';
        },
      },
    });
  await expect(run(failure)).rejects.toBe(failure);
  await expect(
    run(Object.assign(new Error('absent'), { code: 'ENOENT' }))
  ).resolves.toBeUndefined();
});
