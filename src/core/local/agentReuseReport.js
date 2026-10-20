/** @typedef {{category: string, modulePath: string | null, detail: string}} Friction */
/** @typedef {Record<string, unknown> & {taskId: string, feature: string, sourceNote: string, integrationFriction: Friction[]}} ReuseNote */

const FRICTION_CATEGORIES = ['discoverability', 'api', 'missing-capability'];

/**
 * Parse the report command arguments.
 * @param {string[]} args Command-line arguments.
 * @returns {{inputPath: string, eligibleTasksPath?: string, error?: string}} Parsed paths or an error.
 */
export function parseAgentReuseReportArguments(args) {
  let inputPath = 'notes/agents/reuse-events.jsonl';
  let hasInputPath = false;
  let eligibleTasksPath;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--eligible-tasks') {
      if (eligibleTasksPath !== undefined) {
        return { inputPath, error: 'Use --eligible-tasks only once.' };
      }
      const nextArgument = args[index + 1];
      if (!nextArgument || nextArgument.startsWith('--')) {
        return {
          inputPath,
          error: '--eligible-tasks requires a JSON manifest path.',
        };
      }
      eligibleTasksPath = nextArgument;
      index += 1;
    } else if (argument.startsWith('-')) {
      return { inputPath, error: `Unknown option: ${argument}` };
    } else if (hasInputPath) {
      return { inputPath, error: 'Provide only one reuse-events JSONL path.' };
    } else {
      inputPath = argument;
      hasInputPath = true;
    }
  }
  return { inputPath, eligibleTasksPath };
}

/**
 * Create a pure handler for agent reuse notes.
 * @param {{sourceNoteExists?: (sourceNotePath: string) => boolean | undefined}} [options] Optional repository evidence lookup.
 * @returns {(content: string, eligibleTasksContent?: string) => {exitCode: number, output: string}} Handler that formats a report or validation errors.
 */
export function createAgentReuseReportHandle(options = {}) {
  return function handleAgentReuseReport(content, eligibleTasksContent) {
    const { records, errors } = parseReuseNotes(content);
    if (errors.length) return { exitCode: 1, output: errors.join('\n') };
    let eligibleTaskIds;
    if (eligibleTasksContent !== undefined) {
      const eligibility = parseEligibleTaskIds(eligibleTasksContent);
      if (eligibility.errors.length) {
        return { exitCode: 1, output: eligibility.errors.join('\n') };
      }
      eligibleTaskIds = eligibility.taskIds;
    }
    return {
      exitCode: 0,
      output: aggregateReuseNotes(records, {
        eligibleTaskIds,
        sourceNoteExists: options.sourceNoteExists,
      }),
    };
  };
}

/**
 * Parse a JSON array of task IDs that are expected to have reuse records.
 * @param {string} content JSON manifest content.
 * @returns {{taskIds: string[], errors: string[]}} Normalized IDs and validation errors.
 */
export function parseEligibleTaskIds(content) {
  let candidate;
  try {
    candidate = JSON.parse(content);
  } catch (error) {
    return {
      taskIds: [],
      errors: [`Eligibility manifest: invalid JSON (${error.message})`],
    };
  }
  if (!Array.isArray(candidate)) {
    return {
      taskIds: [],
      errors: ['Eligibility manifest: expected an array of task IDs'],
    };
  }

  /** @type {string[]} */
  const taskIds = [];
  /** @type {string[]} */
  const errors = [];
  const seen = new Set();
  candidate.forEach((value, index) => {
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(
        `Eligibility manifest: item ${index + 1} must be a non-empty task ID`
      );
      return;
    }
    const taskId = value.trim();
    if (seen.has(taskId)) {
      errors.push(`Eligibility manifest: duplicate task ID ${taskId}`);
      return;
    }
    seen.add(taskId);
    taskIds.push(taskId);
  });
  return { taskIds, errors };
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
  if (!isRepoPath(candidate.sourceNote)) {
    errors.push(`${prefix}: sourceNote must be a repository-relative path`);
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
 * @param {{eligibleTaskIds?: string[], sourceNoteExists?: (sourceNotePath: string) => boolean | undefined}} [options] Eligibility and source-note evidence inputs.
 * @returns {string} Markdown report.
 */
export function aggregateReuseNotes(records, options = {}) {
  const { eligibleTaskIds } = options;
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

  const report = [
    '| Friction category | Count | Examples |',
    '| --- | ---: | --- |',
    ...FRICTION_CATEGORIES.map(category =>
      [
        `| ${category} | ${counts[category]} |`,
        examples[category].length ? examples[category].join('<br>') : '—',
        '|',
      ].join(' ')
    ),
  ];
  report.push(
    '',
    '## Reuse coverage',
    '',
    '| Measure | Result |',
    '| --- | ---: |'
  );
  report.push(
    `| Latest valid reuse events | ${latestRecords.size} |`,
    `| Superseded historical events | ${records.length - latestRecords.size} |`
  );

  if (eligibleTaskIds === undefined) {
    report.push(
      '| Eligible task list | unknown (not provided) |',
      '| Eligible tasks missing events | unknown |',
      '| Eligible event source notes found | unknown |',
      '| Eligible event source notes missing | unknown |'
    );
  } else {
    const missingTaskIds = eligibleTaskIds.filter(
      taskId => !latestRecords.has(taskId)
    );
    const eventRecords = eligibleTaskIds
      .map(taskId => latestRecords.get(taskId))
      .filter(record => record !== undefined);
    const sourceNoteCounts = eventRecords.reduce(
      (counts, record) => {
        if (typeof options.sourceNoteExists !== 'function') {
          counts.unknown += 1;
        } else {
          let exists;
          try {
            exists = options.sourceNoteExists(record.sourceNote);
          } catch {
            exists = undefined;
          }
          if (exists === true) counts.found += 1;
          else if (exists === false) counts.missing += 1;
          else counts.unknown += 1;
        }
        return counts;
      },
      { found: 0, missing: 0, unknown: 0 }
    );
    report.push(
      `| Eligible tasks | ${eligibleTaskIds.length} |`,
      `| Eligible tasks with latest valid event | ${eventRecords.length} |`,
      `| Eligible tasks missing events | ${missingTaskIds.length} |`,
      `| Eligible event source notes found | ${sourceNoteCounts.found} |`,
      `| Eligible event source notes missing | ${sourceNoteCounts.missing} |`,
      `| Eligible event source notes unchecked | ${sourceNoteCounts.unknown} |`
    );
  }

  return report.join('\n');
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
