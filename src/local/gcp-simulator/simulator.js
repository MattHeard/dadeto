export * from '../../core/local/gcp-simulator/simulator.js';
import { createLocalGcpSimulator as createSimulator } from '../../core/local/gcp-simulator/simulator.js';
import { bindEffectBoundary, bindEffectResponder } from '../allow-effects.js';
import { saveStorageFile } from './effect-adapters.js';

/**
 * Keep local public routes compatible while minting at the environment boundary.
 * @param {Parameters<typeof createSimulator>[0]} [options] Simulator configuration.
 * @returns {Promise<any>} Externally bound simulator.
 */
export async function createLocalGcpSimulator(options) {
  const simulator = /** @type {any} */ (
    await createSimulator({ ...options, bindEffectBoundary, saveStorageFile })
  );
  simulator.routes.submitNewStory = bindEffectResponder(simulator.routes.submitNewStory);
  simulator.routes.submitNewPage = bindEffectResponder(simulator.routes.submitNewPage);
  return simulator;
}
