import { createPathHandle } from '../core/path.js';

const handle = createPathHandle();

export const {
  getCurrentDirectory, resolveProjectDirectories, createPathAdapters,
} = handle;

export { handle };
