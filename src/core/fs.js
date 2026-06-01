import fs from 'node:fs';

const { promises: fsPromises } = fs;

/** Sync filesystem helpers for the copy generator. */
export function createFsAdapters() {
  return {
    directoryExists: target => fs.existsSync(target),
    createDirectory: target => fs.mkdirSync(target, { recursive: true }),
    removeDirectory: target =>
      fs.rmSync(target, { recursive: true, force: true }),
    copyFile: (source, destination) => fs.copyFileSync(source, destination),
    readDirEntries: dir => fs.readdirSync(dir, { withFileTypes: true }),
  };
}

/** Async filesystem helpers that swallow missing directories. */
export function createAsyncFsAdapters() {
  return {
    async readDirEntries(dir) {
      try {
        return await fsPromises.readdir(dir, { withFileTypes: true });
      } catch (error) {
        if (error?.code === 'ENOENT') {
          return [];
        }
        throw error;
      }
    },
    ensureDirectory: target => fsPromises.mkdir(target, { recursive: true }),
    copyFile: (source, destination) => fsPromises.copyFile(source, destination),
  };
}

/**
 * Create the filesystem adapter wrapper handle.
 * @returns {{
 *   createFsAdapters: typeof createFsAdapters,
 *   createAsyncFsAdapters: typeof createAsyncFsAdapters
 * }} Filesystem adapter exports.
 */
export function createFsHandle() {
  return { createFsAdapters, createAsyncFsAdapters };
}
