import fs from 'node:fs';

import {
  createFsHandle as createFsHandleCore,
} from './commonCore.js';

const handle = createFsHandleCore({
  fsModule: fs,
  fsPromisesModule: fs.promises,
});

export const {
  createFsAdapters,
  createAsyncFsAdapters,
} = handle;

export const createFsHandle = createFsHandleCore;

export { handle };
