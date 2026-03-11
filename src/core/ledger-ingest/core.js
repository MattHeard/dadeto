/**
 * Contracts and fixtures for the ledger-ingest toy.
 *
 * The contract keeps the pure core friendly to JSON-only inputs/outputs and
 * exposes normalization and dedupe policy examples for downstream adapters.
 */

const DEFAULT_FIELD_MAPPING = {
  postedDate: 'date',
  amount: 'amount',
  description: 'description',
  currency: 'currency',
  recordId: 'id',
};

const DEFAULT_DEDUPE_POLICY = {
  name: 'posted-date-amount-description',
  strategy: 'first-wins',
  candidateFields: ['postedDate', 'amount', 'description'],
  caseInsensitive: true,
};

export const normalizationExamples = [
  'Dates are coerced into YYYY-MM-DD (ISO 8601 date portion) to align postings across sources.',
  'Amounts are converted into signed numbers so debit/credit semantics are explicit.',
  'Descriptions are trimmed, multiple spaces collapse, and strings are lower-cased to reduce noise.',
];

export const dedupePolicyExamples = [
  'Candidate key = postedDate + amount + description (case-insensitive) so matching rows become duplicates.',
  'Strategy "first-wins" keeps the earliest normalized record while reporting any later duplicates.',
];

/**
 * @typedef {object} ImportTransactionsInput
 * @property {string} source Source label for the batch (used in outputs).
 * @property {Record<string, string>} [fieldMapping] Field map from canonical keys to raw record keys.
 * @property {Record<string, unknown>[]} rawRecords Pure JSON records emitted by adapters.
 * @property {DedupePolicy} [dedupePolicy] Behavior knobs for duplicate detection.
 */

/**
 * @typedef {object} ImportTransactionsOutput
 * @property {string} source Source label passed through from the input.
 * @property {NormalizedTransaction[]} canonicalTransactions Normalized, deduped transactions ready for downstream.
 * @property {DuplicateReport[]} duplicateReports Reported duplicates when policy rejects later rows.
 * @property {ImportSummary} summary Aggregated counts and the policy the run relied on.
 * @property {DedupePolicy} policy The dedupe policy used during the run.
 */

/**
 * @typedef {object} DedupePolicy
 * @property {string} name Identifies the policy variant.
 * @property {string} strategy How duplicate conflicts resolve (for now always "first-wins").
 * @property {string[]} candidateFields Canonical fields joined into a dedupe key.
 * @property {boolean} caseInsensitive True when string comparisons ignore case.
 */

/**
 * @typedef {object} NormalizedTransaction
 * @property {string} transactionId Deterministic id derived from the source, dedupe key, and row index.
 * @property {string} dedupeKey The key that was used to detect duplicates.
 * @property {string} source Source label from the import run.
 * @property {string} postedDate Normalized ISO date string (YYYY-MM-DD).
 * @property {number} amount Signed numeric amount.
 * @property {string} currency ISO currency (upper-case, 3 letters).
 * @property {string} description Cleansed description text.
 * @property {number} rawIndex Original row position in the batch.
 * @property {string | undefined} sourceRecordId Adapter-provided id for traceability.
 * @property {{ rawRecord: Record<string, unknown> }} metadata Raw record kept for auditing.
 */

/**
 * @typedef {object} DuplicateReport
 * @property {NormalizedTransaction} existing First row that claimed the dedupe key.
 * @property {NormalizedTransaction} duplicate Later row that matched the key.
 * @property {string} policyName Policy name at the time of the detection.
 * @property {DedupePolicy} policy Full policy details so adapters can replay results.
 */

/**
 * @typedef {object} ImportSummary
 * @property {number} rawRecords Number of raw rows processed.
 * @property {number} canonicalTransactions Total canonical transactions produced.
 * @property {number} duplicatesDetected Reported duplicate rows.
 * @property {string[]} dedupeFields Candidate fields used for dedupe keys.
 * @property {string} dedupeStrategy Name of the dedupe strategy (mirrors policy.name).
 * @property {string[]} normalizationSteps Human-readable summary of normalization passes.
 */

/**
 * @typedef {object} FixtureBundle
 * @property {string} name Fixture name for humans.
 * @property {string} description What behavior the fixture proves.
 * @property {ImportTransactionsInput} input Input that proves the behavior.
 */

export const fixtures = {
  happyPath: {
    name: 'single-source mapping and normalization',
    description:
      'Shows how field mappings, normalization steps, and summary generation tie together.',
    input: {
      source: 'ember-bank-us',
      fieldMapping: {
        postedDate: 'date',
        amount: 'amount',
        description: 'description',
        currency: 'currency',
        recordId: 'id',
      },
      dedupePolicy: {
        name: DEFAULT_DEDUPE_POLICY.name,
        strategy: DEFAULT_DEDUPE_POLICY.strategy,
        candidateFields: [...DEFAULT_DEDUPE_POLICY.candidateFields],
        caseInsensitive: true,
      },
      rawRecords: [
        {
          id: 'HV-001',
          date: '2026-03-01',
          amount: '-45.50',
          description: 'Coffee Shop   - Seattle',
          currency: 'usd',
        },
        {
          id: 'HV-002',
          date: '2026-03-02T07:00:00Z',
          amount: '200.00',
          description: 'Payroll Deposit ',
          currency: 'usd',
        },
      ],
    },
  },
  duplicateDetection: {
    name: 'duplicate detection with first-wins policy',
    description:
      'Ensures that the policy reports a duplicate when successive rows share the same normalized key.',
    input: {
      source: 'local-credit-card',
      fieldMapping: {
        postedDate: 'date',
        amount: 'amount',
        description: 'description',
        currency: 'currency',
        recordId: 'id',
      },
      dedupePolicy: {
        name: DEFAULT_DEDUPE_POLICY.name,
        strategy: DEFAULT_DEDUPE_POLICY.strategy,
        candidateFields: [...DEFAULT_DEDUPE_POLICY.candidateFields],
        caseInsensitive: true,
      },
      rawRecords: [
        {
          id: 'dup-001',
          date: '2026-03-05',
          amount: '120.00',
          description: 'Electric bill',
          currency: 'usd',
        },
        {
          id: 'dup-002',
          date: '2026-03-05T00:00:00Z',
          amount: '120.00',
          description: 'electric bill ',
          currency: 'USD',
        },
        {
          id: 'dup-003',
          date: '2026-03-06',
          amount: '-15.50',
          description: 'Lunch spot',
          currency: 'usd',
        },
      ],
    },
  },
};

/**
 * Import transactions using a deterministic, pure policy-driven core.
 * @param {ImportTransactionsInput} input Input bundle for the import run.
 * @returns {ImportTransactionsOutput} Normalized output and dedupe evidence.
 */
export function importTransactions(input) {
  const sourceLabel =
    typeof input.source === 'string' ? input.source : 'ledger-ingest';
  const rawRecords = Array.isArray(input.rawRecords) ? input.rawRecords : [];
  const fieldMapping = normalizeFieldMapping(input.fieldMapping);
  const dedupePolicy = normalizeDedupePolicy(input.dedupePolicy);

  const canonicalTransactions = [];
  const duplicateReports = [];
  const seenKeys = new Map();

  rawRecords.forEach((record, index) => {
    const normalized = buildNormalizedTransaction(
      record,
      fieldMapping,
      index,
      sourceLabel
    );
    const dedupeKey = buildDedupeKey(normalized, dedupePolicy);
    normalized.dedupeKey = dedupeKey;
    normalized.transactionId = buildTransactionId(
      sourceLabel,
      dedupeKey,
      index
    );

    const existing = seenKeys.get(dedupeKey);
    if (existing) {
      duplicateReports.push({
        policyName: dedupePolicy.name,
        policy: dedupePolicy,
        existing,
        duplicate: normalized,
      });
      return;
    }

    seenKeys.set(dedupeKey, normalized);
    canonicalTransactions.push(normalized);
  });

  const summary = {
    rawRecords: rawRecords.length,
    canonicalTransactions: canonicalTransactions.length,
    duplicatesDetected: duplicateReports.length,
    dedupeFields: [...dedupePolicy.candidateFields],
    dedupeStrategy: dedupePolicy.name,
    normalizationSteps: normalizationExamples,
  };

  return {
    source: sourceLabel,
    canonicalTransactions,
    duplicateReports,
    summary,
    policy: dedupePolicy,
  };
}

/**
 *
 * @param mapping
 */
function normalizeFieldMapping(mapping) {
  if (!mapping || typeof mapping !== 'object') {
    return { ...DEFAULT_FIELD_MAPPING };
  }
  return { ...DEFAULT_FIELD_MAPPING, ...mapping };
}

/**
 *
 * @param policy
 */
function normalizeDedupePolicy(policy) {
  if (!policy || typeof policy !== 'object') {
    return { ...DEFAULT_DEDUPE_POLICY };
  }

  return {
    name:
      typeof policy.name === 'string'
        ? policy.name
        : DEFAULT_DEDUPE_POLICY.name,
    strategy:
      typeof policy.strategy === 'string'
        ? policy.strategy
        : DEFAULT_DEDUPE_POLICY.strategy,
    candidateFields: Array.isArray(policy.candidateFields)
      ? policy.candidateFields
      : [...DEFAULT_DEDUPE_POLICY.candidateFields],
    caseInsensitive:
      typeof policy.caseInsensitive === 'boolean'
        ? policy.caseInsensitive
        : DEFAULT_DEDUPE_POLICY.caseInsensitive,
  };
}

/**
 *
 * @param record
 * @param mapping
 * @param index
 * @param source
 */
function buildNormalizedTransaction(record, mapping, index, source) {
  const postedDate = normalizeDate(record[mapping.postedDate]);
  const amount = normalizeAmount(record[mapping.amount]);
  const currency = normalizeCurrency(record[mapping.currency]);
  const description = normalizeDescription(record[mapping.description]);

  return {
    source,
    rawIndex: index,
    postedDate,
    amount,
    currency,
    description,
    sourceRecordId: ensureString(record[mapping.recordId]),
    metadata: { rawRecord: record },
  };
}

/**
 *
 * @param source
 * @param dedupeKey
 * @param index
 */
function buildTransactionId(source, dedupeKey, index) {
  return `${source}:${dedupeKey}:${index}`;
}

/**
 *
 * @param transaction
 * @param policy
 */
function buildDedupeKey(transaction, policy) {
  return policy.candidateFields
    .map(field => {
      const candidate = transaction[field];
      if (typeof candidate === 'string') {
        return policy.caseInsensitive ? candidate.toLowerCase() : candidate;
      }
      if (typeof candidate === 'number') {
        return `${candidate}`;
      }
      return '';
    })
    .join('|');
}

/**
 *
 * @param value
 */
function normalizeDate(value) {
  const candidate = new Date(value);
  if (Number.isNaN(candidate.getTime())) {
    return '';
  }
  return candidate.toISOString().slice(0, 10);
}

/**
 *
 * @param value
 */
function normalizeAmount(value) {
  if (typeof value === 'number') {
    return value;
  }
  const cleaned = String(value ?? '').replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
}

/**
 *
 * @param value
 */
function normalizeCurrency(value) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim().toUpperCase();
  }
  return 'USD';
}

/**
 *
 * @param value
 */
function normalizeDescription(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 *
 * @param value
 */
function ensureString(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value);
}
