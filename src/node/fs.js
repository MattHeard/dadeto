import fs from 'fs';

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
