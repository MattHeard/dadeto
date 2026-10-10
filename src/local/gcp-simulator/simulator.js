export * from '../../core/local/gcp-simulator/simulator.js';
import { createLocalGcpSimulator as createSimulator } from '../../core/local/gcp-simulator/simulator.js';
import { bindEffectBoundary, bindEffectResponder } from '../allow-effects.js';

/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {object} file @param {string} contents @param {object} options @returns {Promise<unknown>} */
const saveStorageFile = (permission, file, contents, options) => {
  void permission;
  return /** @type {{save: (contents: string, options: object) => Promise<unknown>}} */ (file).save(contents, options);
};
/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {{update: (data: Record<string, unknown>) => Promise<unknown>}} reference @param {Record<string, unknown>} data @returns {Promise<unknown>} */
const updateFirestoreDocument = (permission, reference, data) => {
  void permission;
  return reference.update(data);
};
/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {{set: (data: Record<string, unknown>) => Promise<unknown>}} reference @param {Record<string, unknown>} data @returns {Promise<unknown>} */
const setFirestoreDocument = (permission, reference, data) => {
  void permission;
  return reference.set(data);
};
/** @param {{runTransaction: (update: (transaction: any) => Promise<unknown>) => Promise<unknown>}} db @returns {object} */
const createCreditEventEffectAdapters = db => ({
  runTransaction: (permission, update) => { void permission; return db.runTransaction(update); },
  getTransactionDocument: (permission, transaction, reference) => { void permission; return transaction.get(reference); },
  setTransactionDocument: (permission, transaction, reference, data) => { void permission; return transaction.set(reference, data); },
});

/**
 * Keep local public routes compatible while minting at the environment boundary.
 * @param {Parameters<typeof createSimulator>[0]} [options] Simulator configuration.
 * @returns {Promise<any>} Externally bound simulator.
 */
export async function createLocalGcpSimulator(options) {
  const simulator = /** @type {any} */ (
    await createSimulator({
      ...options,
      bindEffectBoundary,
      saveStorageFile,
      setFirestoreDocument,
      createCreditEventEffectAdapters,
      updateFirestoreDocument,
    })
  );
  simulator.routes.submitNewStory = bindEffectResponder(simulator.routes.submitNewStory);
  simulator.routes.submitNewPage = bindEffectResponder(simulator.routes.submitNewPage);
  return simulator;
}
