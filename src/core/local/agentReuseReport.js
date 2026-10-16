/** @typedef {{category: string, modulePath: string | null, detail: string}} Friction */
/** @typedef {Record<string, unknown> & {taskId: string, feature: string, sourceNote: string, integrationFriction: Friction[]}} ReuseNote */

const FRICTION_CATEGORIES = ['discoverability', 'api', 'missing-capability'];

/**
 * Create a pure handler for agent reuse notes.
 * @returns {(content: string) => {exitCode: number, output: string}} Handler that formats a report or validation errors.
 */
export function createAgentReuseReportHandle() {
  return function handleAgentReuseReport(content) {
    const { records, errors } = parseReuseNotes(content);
    if (errors.length) return { exitCode: 1, output: errors.join('\n') };
    return { exitCode: 0, output: aggregateReuseNotes(records) };
  };
}

/**
 * Parse and validate append-only agent reuse records.
 * @param {string} content JSONL file content.
 * @returns {{records: ReuseNote[], errors: string[]}} Parsed records and validation errors.
 */
export function parseReuseNotes(content) {
  /** @type {ReuseNote[]} */
  const records = [];
  /** @type {string[]} */
  const errors = [];
  const lines = content.split(/\r?\n/u);

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      errors.push(`Line ${index + 1}: invalid JSON (${error.message})`);
      return;
    }
    const validationErrors = validateRecord(record, index + 1);
    errors.push(...validationErrors);
    if (validationErrors.length === 0) {
      records.push(/** @type {ReuseNote} */ (record));
    }
  });

  return { records, errors };
}

/**
 * Validate one record against schema version 1.
 * @param {unknown} record Candidate record.
 * @param {number} lineNumber JSONL line number.
 * @returns {string[]} Validation errors.
 */
function validateRecord(record, lineNumber) {
  const errors = [];
  const prefix = `Line ${lineNumber}`;
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return [`${prefix}: expected an object`];
  }
  const candidate = /** @type {Record<string, unknown>} */ (record);

  if (candidate.schemaVersion !== 1)
    errors.push(`${prefix}: schemaVersion must be 1`);
  for (const field of ['taskId', 'feature', 'sourceNote']) {
    if (typeof candidate[field] !== 'string' || !candidate[field].trim()) {
      errors.push(`${prefix}: ${field} must be a non-empty string`);
    }
  }
  validatePathList(candidate.reusedModules, 'reusedModules', prefix, errors);
  validatePathList(candidate.newModules, 'newModules', prefix, errors);
  validateRejectedModules(candidate.consideredButRejected, prefix, errors);
  validateFriction(candidate.integrationFriction, prefix, errors);
  validateEstimate(candidate.reuseEstimate, prefix, errors);
  return errors;
}

/**
 * @param {unknown} paths Candidate repository paths.
 * @param {string} field Field name.
 * @param {string} prefix Error prefix.
 * @param {string[]} errors Error collector.
 */
function validatePathList(paths, field, prefix, errors) {
  if (!Array.isArray(paths) || paths.some(path => !isRepoPath(path))) {
    errors.push(
      `${prefix}: ${field} must be an array of repository-relative paths`
    );
  }
}

/**
 * @param {unknown} entries Candidate rejected-module entries.
 * @param {string} prefix Error prefix.
 * @param {string[]} errors Error collector.
 */
function validateRejectedModules(entries, prefix, errors) {
  if (!requireArray(entries, 'consideredButRejected', prefix, errors)) return;
  entries.forEach((entry, index) => {
    const candidate = toRecord(entry);
    if (
      !entry ||
      typeof entry !== 'object' ||
      !isRepoPath(candidate.modulePath) ||
      !hasText(candidate.reason)
    ) {
      errors.push(
        `${prefix}: consideredButRejected[${index}] needs modulePath and reason`
      );
    }
  });
}

/**
 * @param {unknown} entries Candidate friction entries.
 * @param {string} prefix Error prefix.
 * @param {string[]} errors Error collector.
 */
function validateFriction(entries, prefix, errors) {
  if (!requireArray(entries, 'integrationFriction', prefix, errors)) return;
  entries.forEach((entry, index) => {
    const candidate = toRecord(entry);
    const validCategory =
      typeof candidate.category === 'string' &&
      FRICTION_CATEGORIES.includes(candidate.category);
    const validPath =
      candidate.modulePath === null || isRepoPath(candidate.modulePath);
    if (
      !entry ||
      typeof entry !== 'object' ||
      !validCategory ||
      !validPath ||
      !hasText(candidate.detail)
    ) {
      errors.push(
        `${prefix}: integrationFriction[${index}] needs a known category, optional modulePath, and detail`
      );
    }
  });
}

/**
 * @param {unknown} estimate Candidate estimate.
 * @param {string} prefix Error prefix.
 * @param {string[]} errors Error collector.
 */
function validateEstimate(estimate, prefix, errors) {
  const candidate = /** @type {Record<string, unknown>} */ (
    estimate && typeof estimate === 'object' ? estimate : {}
  );
  if (
    !estimate ||
    typeof estimate !== 'object' ||
    !hasText(candidate.rationale)
  ) {
    errors.push(`${prefix}: reuseEstimate needs fraction and rationale`);
    return;
  }
  const fraction = candidate.fraction;
  if (
    fraction !== null &&
    (typeof fraction !== 'number' || fraction < 0 || fraction > 1)
  ) {
    errors.push(
      `${prefix}: reuseEstimate.fraction must be null or between 0 and 1`
    );
  }
}

/**
 * Aggregate examples by friction category, using the latest record per task.
 * @param {ReuseNote[]} records Valid records.
 * @returns {string} Markdown report.
 */
export function aggregateReuseNotes(records) {
  /** @type {Map<string, ReuseNote>} */
  const latestRecords = new Map();
  records.forEach(record => latestRecords.set(record.taskId, record));
  /** @type {Record<string, number>} */
  const counts = Object.fromEntries(
    FRICTION_CATEGORIES.map(category => [category, 0])
  );
  /** @type {Record<string, string[]>} */
  const examples = Object.fromEntries(
    FRICTION_CATEGORIES.map(category => [category, []])
  );

  for (const record of latestRecords.values()) {
    for (const friction of record.integrationFriction) {
      counts[friction.category] += 1;
      examples[friction.category].push(
        `  - [${record.feature}](${record.sourceNote}): ${friction.detail}`
      );
    }
  }

  return [
    '| Friction category | Count | Examples |',
    '| --- | ---: | --- |',
    ...FRICTION_CATEGORIES.map(category =>
      [
        `| ${category} | ${counts[category]} |`,
        examples[category].length ? examples[category].join('<br>') : '—',
        '|',
      ].join(' ')
    ),
  ].join('\n');
}

/**
 * @param {unknown} value Candidate repository path.
 * @returns {boolean} Whether it is relative and non-empty.
 */
function isRepoPath(value) {
  if (typeof value !== 'string') return false;
  const normalizedPath = value.trim();
  return (
    normalizedPath.length > 0 &&
    !normalizedPath.startsWith('/') &&
    !normalizedPath.split('/').includes('..')
  );
}

/**
 * Validate that a JSON field is an array.
 * @param {unknown} value Candidate field value.
 * @param {string} field Field name for the error message.
 * @param {string} prefix Error prefix.
 * @param {string[]} errors Error collector.
 * @returns {value is unknown[]} Whether the field is an array.
 */
function requireArray(value, field, prefix, errors) {
  if (Array.isArray(value)) return true;
  errors.push(`${prefix}: ${field} must be an array`);
  return false;
}

/**
 * Narrow unknown JSON to an object record for property validation.
 * @param {unknown} value Candidate JSON value.
 * @returns {Record<string, unknown>} Record value or an empty record.
 */
function toRecord(value) {
  if (value && typeof value === 'object') {
    return /** @type {Record<string, unknown>} */ (value);
  }
  return {};
}

/**
 * Check that a value contains visible text.
 * @param {unknown} value Candidate value.
 * @returns {boolean} Whether it is a non-empty string after trimming.
 */
function hasText(value) {
  if (typeof value !== 'string') return false;
  return value.trim().length > 0;
}
