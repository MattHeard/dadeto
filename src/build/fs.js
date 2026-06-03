import fs from 'node:fs';
import { createFsHandle } from '../core/commonCore.js';

const handle = createFsHandle({
  fsModule: fs,
  fsPromisesModule: fs.promises,
});

export const { createFsAdapters, createAsyncFsAdapters } = handle;

export { handle };
