/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {(permission: AllowEffects) => string} SimulatorUuidProvider */
/** @typedef {{randomUUID: () => string, createRandomSource: () => () => number}} SimulatorRandomness */

/**
 * Bind simulator lifetime permission for existing no-argument SDK callbacks.
 * The provider returns canonical UUIDs; their first field contains32 random bits.
 * @param {AllowEffects} permission Simulator startup permission.
 * @param {SimulatorUuidProvider} generateUuid Required canonical UUID provider.
 * @returns {SimulatorRandomness} Lazy UUID and random-source callbacks.
 */
export function createSimulatorRandomness(permission, generateUuid) {
  const randomUUID = () => generateUuid(permission);
  const createRandomSource = () => () =>
    Number.parseInt(randomUUID().split('-')[0], 16) / 0xffffffff;
  return { randomUUID, createRandomSource };
}
