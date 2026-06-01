import { createFsHandle } from '../core/fs.js';

const handle = createFsHandle();

export const { createFsAdapters, createAsyncFsAdapters } = handle;

export { handle };
