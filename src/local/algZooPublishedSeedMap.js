import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createAlgZooPublishedSeedMapCore } from '../core/local/algZooPublishedSeedMapCore.js';

const coreFactory = createAlgZooPublishedSeedMapCore;
const handle = coreFactory({
  readFixture: () =>
    JSON.parse(
      readFileSync(
        new URL('../../test/fixtures/interpretability/alg-zoo-m16-10.json', import.meta.url),
        'utf8'
      )
    ),
  hashSha256: value => createHash('sha256').update(value, 'utf8').digest('hex'),
});

export { handle as createAlgZooPublishedSeedMapV3 };
