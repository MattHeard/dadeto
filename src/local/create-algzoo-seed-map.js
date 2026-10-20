import { writeFileSync } from 'node:fs';
import { z } from 'zod';
import { createAlgZooPublishedSeedMapV3 } from './algZooPublishedSeedMap.js';

const output = new URL(
  '../../docs/interpretability/algzoo-m16-10-arc-seed-map-v3.json',
  import.meta.url
);
const json = createAlgZooPublishedSeedMapV3({ z });
writeFileSync(output, `${json}\n`, 'utf8');
process.stdout.write(`Wrote ${output.pathname}\n`);
