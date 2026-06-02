import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createPathHandle as createPathHandleCore,
} from './commonCore.js';

const handle = createPathHandleCore({
  pathModule: path,
  fileURLToPathFn: fileURLToPath,
  dirnameFn: path.dirname,
});

export const {
  getCurrentDirectory,
  resolveProjectDirectories,
  createPathAdapters,
} = handle;

export const createPathHandle = createPathHandleCore;

export { handle };
