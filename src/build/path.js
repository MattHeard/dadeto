import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPathHandle } from '../core/commonCore.js';

const handle = createPathHandle({
  pathModule: path,
  fileURLToPathFn: fileURLToPath,
  dirnameFn: path.dirname,
});

export const {
  getCurrentDirectory, resolveProjectDirectories, createPathAdapters,
} = handle;

export { handle };
