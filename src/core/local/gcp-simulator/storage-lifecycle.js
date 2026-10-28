/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {{createStorageRoot: (permission: AllowEffects) => Promise<string>, clearStorageRoot: (permission: AllowEffects, storageRoot: string) => Promise<void>}} StorageLifecyclePlatform */
/** @typedef {{storageRoot: string, clear: (permission: AllowEffects) => Promise<void>}} SimulatorStorageResource */

/**
 * Allocate one simulator storage root and retain it for explicit cleanup calls.
 * @param {AllowEffects} permission Startup permission.
 * @param {StorageLifecyclePlatform} platform Required filesystem capabilities.
 * @returns {Promise<SimulatorStorageResource>} Allocated storage and cleanup capability.
 */
export async function createSimulatorStorage(permission, platform) {
  const storageRoot = await platform.createStorageRoot(permission);
  return {
    storageRoot,
    clear: permission => platform.clearStorageRoot(permission, storageRoot),
  };
}
