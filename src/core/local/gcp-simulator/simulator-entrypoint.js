/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {typeof import('./simulator.js').createLocalGcpSimulator} CoreSimulatorConstructor */
/** @typedef {NonNullable<Parameters<CoreSimulatorConstructor>[2]>} SimulatorOptions */
/** @typedef {(options?: SimulatorOptions) => ReturnType<CoreSimulatorConstructor>} SimulatorConstructor */

/**
 * Bind platform defaults and enter a scoped permission before constructing a simulator.
 * @param {(permission: AllowEffects, options: NonNullable<Parameters<SimulatorConstructor>[0]>) => ReturnType<SimulatorConstructor>} createSimulator Permission-first constructor adapter.
 * @param {NonNullable<Parameters<SimulatorConstructor>[0]>} defaults Local platform adapters.
 * @param {import('../../../../types/allow-effects').AllowEffectsBoundary} bindEffectBoundary Startup invocation boundary.
 * @returns {SimulatorConstructor} Configured simulator constructor.
 */
export function createSimulatorHandle(
  createSimulator,
  defaults,
  bindEffectBoundary
) {
  return options =>
    bindEffectBoundary(permission =>
      createSimulator(permission, { ...options, ...defaults })
    );
}
