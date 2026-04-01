/**
 * Shared ledger-ingest constants and helpers.
 */
export const DEFAULT_LEDGER_INGEST_DEDUPE_POLICY = {
  name: 'posted-date-amount-description',
  strategy: 'first-wins',
  candidateFields: ['postedDate', 'amount', 'description'],
  caseInsensitive: true,
};

/**
 * Create a fresh dedupe policy object for the ledger-ingest flow.
 * @returns {{
 *   name: string,
 *   strategy: string,
 *   candidateFields: string[],
 *   caseInsensitive: boolean,
 * }} Copy of the default dedupe policy.
 */
export function createDefaultLedgerIngestDedupePolicy() {
  return {
    name: DEFAULT_LEDGER_INGEST_DEDUPE_POLICY.name,
    strategy: DEFAULT_LEDGER_INGEST_DEDUPE_POLICY.strategy,
    candidateFields: [...DEFAULT_LEDGER_INGEST_DEDUPE_POLICY.candidateFields],
    caseInsensitive: DEFAULT_LEDGER_INGEST_DEDUPE_POLICY.caseInsensitive,
  };
}
