import { createAlgZooPilotRunner } from '../../core/interpretability/algZooPilotHarness/index.js';
import defaultLedger from './algZooAuditLedger.js';

/**
 * Bind the core pair runner to the local hash-chained JSONL ledger.
 * @param {Record<string, any>} adapters Non-persistence pilot adapters.
 * @param {{append: (eventType: string, payload: Record<string, any>) => Promise<unknown>}} [ledger] Local ledger or a test double.
 * @returns {ReturnType<typeof createAlgZooPilotRunner>} Runner with durable audit writes.
 */
export function createAuditedAlgZooPilotRunner(adapters, ledger = defaultLedger) {
  if (typeof ledger?.append !== 'function') {
    throw new TypeError('A local AlgZoo audit ledger is required.');
  }
  return createAlgZooPilotRunner({
    ...adapters,
    appendAuditRecord: async (eventType, payload) => {
      await ledger.append(eventType, payload);
    },
  });
}
