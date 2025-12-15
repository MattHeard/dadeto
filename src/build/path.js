import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Determine the directory of the current module using Node-specific helpers.
 * @param {string} moduleUrl - The module URL from import.meta.url.
 * @returns {string} Absolute path to the module directory.
 */
export function getCurrentDirectory(moduleUrl) {
  return path.dirname(fileURLToPath(moduleUrl));
}

/**
 * Resolve key project directories relative to a given module directory.
 * @param {string} moduleDirectory - Directory containing the current module.
 * @returns {{ projectRoot: string, srcDir: string, publicDir: string }} Project directory map.
 */
export function resolveProjectDirectories(moduleDirectory) {
  const projectRoot = path.resolve(moduleDirectory, '../..');
  const srcDir = path.resolve(projectRoot, 'src');
  const publicDir = path.resolve(projectRoot, 'public');

  return { projectRoot, srcDir, publicDir };
}

/**
 * Provide the subset of Node's path module used by copy utilities.
 * @returns {{
 *   join: typeof path.join,
 *   dirname: typeof path.dirname,
 *   relative: typeof path.relative,
 *   resolve: typeof path.resolve,
 *   extname: typeof path.extname,
 * }} Adapter exposing required path helpers.
 */
export function createPathAdapters() {
  return {
    join: path.join,
    dirname: path.dirname,
    relative: path.relative,
    resolve: path.resolve,
    extname: path.extname,
  };
}

/**
 * Build the directory map used by the copy generator.
 * @param {{ projectRoot: string, srcDir: string, publicDir: string }} baseDirectories - Base project directories.
 * @param {Array<[string, string]>} sharedDirectoryEntries - Shared directories derived from core helpers.
 * @returns {Record<string, string>} Comprehensive directory map for copy routines.
 */
export function createCopyDirectories(baseDirectories, sharedDirectoryEntries) {
  const { projectRoot, srcDir, publicDir } = baseDirectories;
  const sharedEntries = Object.fromEntries(sharedDirectoryEntries);

  return {
    projectRoot,
    srcDir,
    publicDir,
    ...sharedEntries,
  };
}
