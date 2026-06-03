import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCopyCloudHandle } from '../core/build/copy-cloud.js';

await createCopyCloudHandle({
  fileURLToPathFn: fileURLToPath,
  dirnameFn: path.dirname,
  pathModule: path,
  fsPromisesModule: fs.promises,
  logger: console,
});
