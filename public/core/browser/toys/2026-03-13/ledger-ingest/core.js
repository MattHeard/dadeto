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

const REQUIRED_CANONICAL_FIELDS = ['postedDate', 'amount'];
const INVALID_ROW_REASON_MISSING_FIELDS = 'missing-required-fields';

/**
 * Build the standard fixture input used by the sample data bundles.
 * @param {string} source Source label for the sample input.
 * @param {Record<string, unknown>[]} rawRecords Raw rows for the fixture.
 * @returns {ImportTransactionsInput} Fixture input bundle.
 */
function createStandardFixtureInput(source, rawRecords) {
  return {
    source,
    fieldMapping: { ...DEFAULT_FIELD_MAPPING },
    dedupePolicy: {
      name: DEFAULT_DEDUPE_POLICY.name,
      strategy: DEFAULT_DEDUPE_POLICY.strategy,
      candidateFields: [...DEFAULT_DEDUPE_POLICY.candidateFields],
      caseInsensitive: true,
    },
    rawRecords,
  };
}

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
 * @property {InvalidRowReport[]} errorReports Structured errors collected while validating the batch.
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
 * @property {number} errorsDetected Number of rows rejected with structured errors.
 * @property {string[]} dedupeFields Candidate fields used for dedupe keys.
 * @property {string} dedupeStrategy Name of the dedupe strategy (mirrors policy.name).
 * @property {string[]} normalizationSteps Human-readable summary of normalization passes.
 */

/**
 * @typedef {object} InvalidRowReport
 * @property {number} index Index (0-based) of the invalid row in the input batch.
 * @property {string[]} missingFields Canonical fields that were not provided.
 * @property {Record<string, unknown>} rawRecord Original raw record that triggered the report.
 * @property {string} reason Machine-readable reason code for the rejection.
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
    input: createStandardFixtureInput('ember-bank-us', [
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
    ]),
  },
  duplicateDetection: {
    name: 'duplicate detection with first-wins policy',
    description:
      'Ensures that the policy reports a duplicate when successive rows share the same normalized key.',
    input: createStandardFixtureInput('local-credit-card', [
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
    ]),
  },
  repeatImport: {
    name: 'repeat import rows treated as duplicates',
    description:
      'Verifies that importing the same logical row twice only counts once as canonical.',
    input: createStandardFixtureInput('core-processor', [
      {
        id: 'repeat-001',
        date: '2026-03-07',
        amount: '55',
        description: 'Gym membership',
        currency: 'USD',
      },
      {
        id: 'repeat-002',
        date: '2026-03-07T00:00:00Z',
        amount: '55.00',
        description: 'Gym Membership ',
        currency: 'usd',
      },
    ]),
  },
  invalidRow: {
    name: 'invalid rows report structured errors',
    description:
      'Proves that missing required fields are surfaced as structured errors instead of new transactions.',
    input: createStandardFixtureInput('virtual-credit', [
      {
        id: 'valid-001',
        date: '2026-03-08',
        amount: '120.75',
        description: 'Valid row',
        currency: 'usd',
      },
      {
        id: 'invalid-001',
        date: '',
        amount: null,
        description: 'Missing critical fields',
        currency: 'usd',
      },
    ]),
  },
};

export const ledgerIngestCoreTestOnly = {
  getSourceLabel,
  getRawRecords,
  findMissingRequiredFields,
  isMissingRequiredField,
  getRequiredRawValue,
  isMissingRequiredValue,
  isBlankStringValue,
  normalizeFieldMapping,
  sanitizeFieldMapping,
  normalizeDedupePolicy,
  sanitizePolicy,
  sanitizePolicyName,
  sanitizePolicyStrategy,
  sanitizePolicyCandidateFields,
  sanitizePolicyCaseInsensitive,
  buildNormalizedTransaction,
  buildTransactionId,
  buildDedupeKey,
  serializeDedupeCandidate,
  normalizeDate,
  normalizeAmount,
  coerceNumericValue,
  stringForNormalization,
  normalizeCurrency,
  trimOrEmpty,
  normalizeDescription,
  ensureString,
};

/**
 * Import transactions using a deterministic, pure policy-driven core.
 * @param {ImportTransactionsInput} input Input bundle for the import run.
 * @returns {ImportTransactionsOutput} Normalized output and dedupe evidence.
 */
export function importTransactions(input) {
  const sourceLabel = getSourceLabel(input);
  const rawRecords = getRawRecords(input.rawRecords);
  const fieldMapping = normalizeFieldMapping(input.fieldMapping);
  const dedupePolicy = normalizeDedupePolicy(input.dedupePolicy);

  const canonicalTransactions = [];
  const duplicateReports = [];
  const errorReports = [];
  const seenKeys = new Map();

  rawRecords.forEach((record, index) => {
    const missingFields = findMissingRequiredFields(record, fieldMapping);
    if (missingFields.length > 0) {
      errorReports.push({
        index,
        missingFields,
        rawRecord: record,
        reason: INVALID_ROW_REASON_MISSING_FIELDS,
      });
      return;
    }

    const normalized = buildNormalizedTransaction({
      record,
      mapping: fieldMapping,
      index,
      source: sourceLabel,
    });
    const dedupeKey = buildDedupeKey(normalized, dedupePolicy);
    normalized.dedupeKey = dedupeKey;
    normalized.transactionId = buildTransactionId(
      sourceLabel,
      dedupeKey,
      index
    );

    recordCanonicalTransaction({
      normalized,
      dedupeKey,
      policy: dedupePolicy,
      seenKeys,
      duplicateReports,
      canonicalTransactions,
    });
  });

  const summary = {
    rawRecords: rawRecords.length,
    canonicalTransactions: canonicalTransactions.length,
    duplicatesDetected: duplicateReports.length,
    errorsDetected: errorReports.length,
    dedupeFields: [...dedupePolicy.candidateFields],
    dedupeStrategy: dedupePolicy.name,
    normalizationSteps: normalizationExamples,
  };

  return {
    source: sourceLabel,
    canonicalTransactions,
    duplicateReports,
    errorReports,
    summary,
    policy: dedupePolicy,
  };
}

const SOURCE_HANDLERS = {
  string: candidate => candidate,
};

/**
 * Pick a source label from the input while defaulting to the toy identifier.
 * @param {ImportTransactionsInput} input Input bundle that may provide a label.
 * @returns {string} Resolved source label.
 */
function getSourceLabel(input) {
  const candidate = input?.source;
  const handler = SOURCE_HANDLERS[typeof candidate];
  return handler?.(candidate) ?? 'ledger-ingest';
}

/**
 * Normalize the raw-records payload into a guaranteed array.
 * @param {Record<string, unknown>[]|undefined} rawRecords Adapter-provided rows.
 * @returns {Record<string, unknown>[]} Safe raw record list.
 */
function getRawRecords(rawRecords) {
  if (Array.isArray(rawRecords)) {
    return rawRecords;
  }
  return [];
}

/**
 * Identify missing canonical values before normalization runs.
 * @param {Record<string, unknown>} record Raw row under review.
 * @param {Record<string, string>} mapping Field mapping for this run.
 * @returns {string[]} Canonical fields that were not provided.
 */
function findMissingRequiredFields(record, mapping) {
  return REQUIRED_CANONICAL_FIELDS.filter(field =>
    isMissingRequiredField(record, mapping, field)
  );
}

/**
 * Check whether a canonical field is absent from a raw record.
 * @param {Record<string, unknown>} record Raw row under review.
 * @param {Record<string, string>} mapping Field mapping for this run.
 * @param {string} field Canonical field name under review.
 * @returns {boolean} True when the field is missing.
 */
function isMissingRequiredField(record, mapping, field) {
  return isMissingRequiredValue(getRequiredRawValue(record, mapping, field));
}

/**
 * Read the raw value for a canonical field, if the mapping defines one.
 * @param {Record<string, unknown>} record Raw row under review.
 * @param {Record<string, string>} mapping Field mapping for this run.
 * @param {string} field Canonical field name under review.
 * @returns {unknown} Raw field value or undefined when the mapping is absent.
 */
function getRequiredRawValue(record, mapping, field) {
  return record?.[mapping[field]];
}

/**
 * Determine whether a raw value should be treated as missing.
 * Strings that are empty or whitespace-only count as missing.
 * @param {unknown} value Candidate input.
 * @returns {boolean} True when the value is absent.
 */
function isMissingRequiredValue(value) {
  return MISSING_VALUES.includes(value) || isBlankStringValue(value);
}

/**
 * Determine whether a value is a blank string.
 * @param {unknown} value Candidate input.
 * @returns {boolean} True when the value is a blank string.
 */
function isBlankStringValue(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return value.trim().length === 0;
}

/**
 * Track duplicates or canonical rows based on the incoming normalized payload.
 * @param {object} options Tracking collections for the dedupe discovery.
 * @param {NormalizedTransaction} options.normalized New normalized transaction.
 * @param {string} options.dedupeKey Key that identifies candidate duplicates.
 * @param {DedupePolicy} options.policy Policy currently in play for this run.
 * @param {Map<string, NormalizedTransaction>} options.seenKeys Seen key cache.
 * @param {DuplicateReport[]} options.duplicateReports Duplicate report sink.
 * @param {NormalizedTransaction[]} options.canonicalTransactions Canonical transaction sink.
 * @returns {void}
 */
function recordCanonicalTransaction({
  normalized,
  dedupeKey,
  policy,
  seenKeys,
  duplicateReports,
  canonicalTransactions,
}) {
  const existing = seenKeys.get(dedupeKey);
  if (existing) {
    duplicateReports.push({
      policyName: policy.name,
      policy,
      existing,
      duplicate: normalized,
    });
    return;
  }

  seenKeys.set(dedupeKey, normalized);
  canonicalTransactions.push(normalized);
}

/**
 * Overlay a field map on top of the defaults so adapters can target canonical
 * keys without leaking undefined or primitive inputs.
 * @param {Record<string, string>} [mapping] Optional overrides from adapters.
 * @returns {Record<string, string>} Canonical field mapping.
 */
function normalizeFieldMapping(mapping) {
  return {
    ...DEFAULT_FIELD_MAPPING,
    ...sanitizeFieldMapping(mapping),
  };
}

const OBJECT_HANDLERS = {
  object: value => value || {},
};

/**
 * Guard that only returns a mapping when the argument is an object.
 * @param {Record<string, string>|null|undefined} mapping Adapter overrides.
 * @returns {Record<string, string>} Valid mapping.
 */
function sanitizeFieldMapping(mapping) {
  const handler = OBJECT_HANDLERS[typeof mapping];
  if (handler) {
    return handler(mapping);
  }
  return {};
}

/**
 * Normalize a dedupe policy while falling back to the defaults for missing
 * knobs.
 * @param {DedupePolicy|Record<string, unknown>} [policy] Partial policy overrides.
 * @returns {DedupePolicy} Policy that is safe for the core logic.
 */
function normalizeDedupePolicy(policy) {
  const sanitizedPolicy = sanitizePolicy(policy);
  return {
    name: sanitizePolicyName(sanitizedPolicy),
    strategy: sanitizePolicyStrategy(sanitizedPolicy),
    candidateFields: sanitizePolicyCandidateFields(sanitizedPolicy),
    caseInsensitive: sanitizePolicyCaseInsensitive(sanitizedPolicy),
  };
}

/**
 * Ensure we always work with an object when normalizing the policy.
 * @param {DedupePolicy|Record<string, unknown>|null|undefined} policy Policy override candidate.
 * @returns {Record<string, unknown>} Safe policy-like object.
 */
function sanitizePolicy(policy) {
  const handler = OBJECT_HANDLERS[typeof policy];
  if (handler) {
    return handler(policy);
  }
  return {};
}

/**
 * Choose a policy name or fall back to the default.
 * @param {Record<string, unknown>} policy Source policy object.
 * @returns {string} Policy name to use.
 */
function sanitizePolicyName(policy) {
  if (typeof policy.name === 'string') {
    return policy.name;
  }
  return DEFAULT_DEDUPE_POLICY.name;
}

/**
 * Choose a strategy or revert to the default.
 * @param {Record<string, unknown>} policy Source policy object.
 * @returns {string} Strategy label.
 */
function sanitizePolicyStrategy(policy) {
  if (typeof policy.strategy === 'string') {
    return policy.strategy;
  }
  return DEFAULT_DEDUPE_POLICY.strategy;
}

/**
 * Pick candidate fields for deduplication.
 * @param {Record<string, unknown>} policy Source policy object.
 * @returns {string[]} Candidate fields for the dedupe key.
 */
function sanitizePolicyCandidateFields(policy) {
  if (Array.isArray(policy.candidateFields)) {
    return [...policy.candidateFields];
  }
  return [...DEFAULT_DEDUPE_POLICY.candidateFields];
}

/**
 * Determine whether comparisons should be case-insensitive.
 * @param {Record<string, unknown>} policy Source policy object.
 * @returns {boolean} Case insensitivity flag.
 */
function sanitizePolicyCaseInsensitive(policy) {
  if (typeof policy.caseInsensitive === 'boolean') {
    return policy.caseInsensitive;
  }
  return DEFAULT_DEDUPE_POLICY.caseInsensitive;
}

/**
 * Build a normalized transaction record using the provided mapping metadata.
 * @param {object} options Options bag so the API stays under three parameters.
 * @param {Record<string, unknown>} options.record Raw record for this row.
 * @param {Record<string, string>} options.mapping Field mapping for this run.
 * @param {number} options.index Zero-based row index.
 * @param {string} options.source Source label for visibility.
 * @returns {NormalizedTransaction} Normalized transaction record.
 */
function buildNormalizedTransaction({ record, mapping, index, source }) {
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
 * Build a deterministic transaction id for tracking and dedupe reporting.
 * @param {string} source Source label used in the identifier.
 * @param {string} dedupeKey Dedupe key produced for the row.
 * @param {number} index Row index to make ids unique.
 * @returns {string} Transaction identifier string.
 */
function buildTransactionId(source, dedupeKey, index) {
  return `${source}:${dedupeKey}:${index}`;
}

/**
 *
 * @param transaction
 * @param policy
 */
/**
 * Join the normalized candidate values to form the dedupe key listed in the
 * policy.
 * @param {NormalizedTransaction} transaction Transaction under review.
 * @param {DedupePolicy} policy Policy controlling the key.
 * @returns {string} Joined dedupe key.
 */
function buildDedupeKey(transaction, policy) {
  const values = [];
  for (const field of policy.candidateFields) {
    values.push(
      serializeDedupeCandidate(transaction[field], policy.caseInsensitive)
    );
  }
  return values.join('|');
}

const dedupeCandidateHandlers = {
  string: (value, caseInsensitive) => {
    if (caseInsensitive) {
      return value.toLowerCase();
    }
    return value;
  },
  number: value => `${value}`,
};

/**
 * Serialize each candidate so comparisons can replay the policy.
 * @param {string|number|undefined} value Candidate field to normalize.
 * @param {boolean} caseInsensitive Flag that forces lowercase strings.
 * @returns {string} String-ready candidate fragment.
 */
function serializeDedupeCandidate(value, caseInsensitive) {
  const handler = dedupeCandidateHandlers[typeof value];
  if (handler) {
    return handler(value, caseInsensitive);
  }
  return '';
}

const MISSING_VALUES = [undefined, null];

/**
 * Convert loose inputs into an ISO date snippet or empty string when parsing
 * fails.
 * @param {string|number|Date|undefined} value Input that may represent a date.
 * @returns {string} ISO date (YYYY-MM-DD) or empty string on failure.
 */
function normalizeDate(value) {
  const candidate = new Date(value);
  if (Number.isNaN(candidate.getTime())) {
    return '';
  }
  return candidate.toISOString().slice(0, 10);
}

/**
 * Normalize a value into a numeric amount with fallbacks for garbage strings.
 * @param {unknown} value Candidate amount input.
 * @returns {number} Normalized numeric amount.
 */
function normalizeAmount(value) {
  if (typeof value === 'number') {
    return value;
  }
  return coerceNumericValue(value);
}

/**
 * @param {unknown} value Candidate amount input.
 * @returns {number} Numeric interpretation of the sanitized value.
 */
function coerceNumericValue(value) {
  const normalized = stringForNormalization(value);
  const cleaned = normalized.replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
}

/**
 * @param {unknown} value Candidate input.
 * @returns {string} Normalized string or empty when missing.
 */
function stringForNormalization(value) {
  const candidate = ensureString(value);
  if (candidate === undefined) {
    return '';
  }
  return candidate;
}

/**
 * Normalize currency codes to uppercase ISO strings, defaulting to USD.
 * @param {unknown} value Candidate currency input.
 * @returns {string} Uppercased ISO currency code.
 */
function normalizeCurrency(value) {
  const candidate = trimOrEmpty(value);
  if (candidate.length === 0) {
    return 'USD';
  }
  return candidate.toUpperCase();
}

/**
 * Trim the candidate string or return an empty value when missing.
 * @param {unknown} value Candidate to trim.
 * @returns {string} Trimmed string or ''.
 */
function trimOrEmpty(value) {
  const candidate = ensureString(value);
  if (candidate === undefined) {
    return '';
  }
  return candidate.trim();
}

/**
 * Trim, collapse whitespace, and lower-case descriptions for consistent keys.
 * @param {unknown} value Raw description text.
 * @returns {string} Cleaned description.
 */
function normalizeDescription(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Return a string only when the input is defined, otherwise leave undefined.
 * @param {unknown} value Candidate to convert.
 * @returns {string|undefined} String when present, otherwise undefined.
 */
function ensureString(value) {
  if (MISSING_VALUES.includes(value)) {
    return undefined;
  }
  return String(value);
}
