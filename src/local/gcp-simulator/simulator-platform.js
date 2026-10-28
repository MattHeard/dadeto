import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** @param {import('../../../types/allow-effects').AllowEffects} permission @returns {Promise<string>} */
const createStorageRoot = permission => {
  void permission;
  return mkdtemp(path.join(os.tmpdir(), 'dadeto-gcp-sim-'));
};
/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {string} storageRoot @returns {Promise<void>} */
const clearStorageRoot = (permission, storageRoot) => {
  void permission;
  return rm(storageRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
};
/** Capture native host metadata inside the simulator startup boundary.
 * @returns {import('../../core/local/gcp-simulator/simulator.js').SimulatorPlatform} Native configuration and filesystem capabilities.
 */
export function createSimulatorPlatform() {
  return {
    publicDir: path.resolve('public'),
    env: { ...process.env },
    createStorageRoot,
    clearStorageRoot,
  };
}
