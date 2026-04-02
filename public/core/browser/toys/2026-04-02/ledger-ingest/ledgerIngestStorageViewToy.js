import { parseJsonOrFallback } from '../../browserToysCore.js';
import {
  buildLedgerIngestStorageViewReport,
  normalizeLedgerStorageState,
  readPermanentStorageRoot,
  resolveStorageKey,
} from '../../2026-03-13/ledger-ingest/ledgerIngestStorageCore.js';

// Toy: Ledger Ingest Storage View
// (string input, env) -> string

/**
 * Read the LEDG3 permanent storage bucket and render the stored transactions.
 * @param {string} input Serialized optional toy settings.
 * @param {Map<string, unknown>} env Environment with `getLocalPermanentData`.
 * @returns {string} JSON string of the current permanent storage view.
 */
export function ledgerIngestStorageViewToy(input, env) {
  const parsedInput = parseJsonOrFallback(input, {});
  const storageKey = resolveStorageKey(parsedInput);
  const permanentRoot = readPermanentStorageRoot(env);
  const storageState = normalizeLedgerStorageState(permanentRoot[storageKey]);

  return JSON.stringify(
    buildLedgerIngestStorageViewReport({
      storageKey,
      storageState,
    })
  );
}
