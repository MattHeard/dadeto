import fs from 'fs';
import { promises as fsPromises } from 'fs';

/**
 * Provide synchronous filesystem helpers required by the copy generator.
 * @returns {{
 *   directoryExists: (target: string) => boolean,
 *   createDirectory: (target: string) => void,
 *   copyFile: (source: string, destination: string) => void,
 *   readDirEntries: (dir: string) => fs.Dirent[],
 * }}
 */
export function createFsAdapters() {
  return {
    directoryExists: target => fs.existsSync(target),
    createDirectory: target => fs.mkdirSync(target, { recursive: true }),
    copyFile: (source, destination) => fs.copyFileSync(source, destination),
    readDirEntries: dir => fs.readdirSync(dir, { withFileTypes: true }),
  };
}

/**
 * Provide asynchronous filesystem helpers used by copy-to-infra scripts.
 * @returns {{
 *   readDirEntries: (dir: string) => Promise<fs.Dirent[]>,
 *   ensureDirectory: (target: string) => Promise<void>,
 *   copyFile: (source: string, destination: string) => Promise<void>,
 * }}
 */
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
