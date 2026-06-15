// Toy: Conflict-Aware Product Scheduler
// (input, env) -> string

/**
 * @typedef {{
 *   id?: unknown,
 *   title?: unknown,
 *   productValue?: unknown,
 *   learningValue?: unknown,
 *   userFeedbackValue?: unknown,
 *   expectedTouchSet?: unknown,
 *   sharedTouchRisk?: unknown,
 *   expectedTestRefactorCollision?: unknown,
 *   expectedDeploymentRisk?: unknown,
 * }} SchedulerCandidateInput
 * @typedef {{
 *   id: string,
 *   title: string,
 *   productValue: number,
 *   learningValue: number,
 *   userFeedbackValue: number,
 *   expectedTouchSet: string[],
 *   sharedTouchRisk: number,
 *   expectedTestRefactorCollision: number,
 *   expectedDeploymentRisk: number,
 * }} SchedulerCandidate
 * @typedef {{
 *   id?: unknown,
 *   touchSet?: unknown,
 *   reservedSurfaces?: unknown,
 * }} SchedulerActiveWorkInput
 * @typedef {{
 *   touchSet: Set<string>,
 *   reservedSurfaces: Set<string>,
 * }} NormalizedActiveWork
 */

/**
 * Score and rank candidate product increments against active work.
 * @param {string} input JSON payload with `candidates` and `activeWork`.
 * @returns {string} Ranked JSON recommendations.
 */
export function conflictAwareProductScheduler(input) {
  const parsed = parseSchedulerInput(input);
  const activeWork = normalizeActiveWork(parsed.activeWork);
  const ranked = normalizeCandidates(parsed.candidates).map(candidate =>
    scoreCandidate(candidate, activeWork)
  );

  ranked.sort(compareRankedCandidates);

  return JSON.stringify(
    {
      ranked,
      summary: {
        candidateCount: ranked.length,
        activeWorkCount: parsed.activeWork.length,
      },
    },
    null,
    2
  );
}

/**
 * Parse scheduler input into arrays.
 * @param {string} input JSON payload.
 * @returns {{ candidates: unknown[], activeWork: unknown[] }} Parsed scheduler payload.
 */
function parseSchedulerInput(input) {
  try {
    return normalizeSchedulerPayload(JSON.parse(input));
  } catch {
    return { candidates: [], activeWork: [] };
  }
}

/**
 * Normalize a parsed scheduler payload.
 * @param {unknown} parsed Parsed JSON value.
 * @returns {{ candidates: unknown[], activeWork: unknown[] }} Normalized payload.
 */
function normalizeSchedulerPayload(parsed) {
  if (!isRecord(parsed)) {
    return { candidates: [], activeWork: [] };
  }

  return {
    candidates: toArray(parsed.candidates),
    activeWork: toArray(parsed.activeWork),
  };
}

/**
 * Normalize candidate records.
 * @param {unknown[]} candidates Raw candidate list.
 * @returns {SchedulerCandidate[]} Normalized candidates.
 */
function normalizeCandidates(candidates) {
  return candidates.map((candidate, index) =>
    normalizeCandidate(candidate, index)
  );
}

/**
 * Normalize a single candidate record.
 * @param {unknown} candidate Raw candidate.
 * @param {number} index Candidate index for fallback ids.
 * @returns {SchedulerCandidate} Normalized candidate.
 */
function normalizeCandidate(candidate, index) {
  /** @type {Record<string, unknown>} */
  let record = {};
  if (isRecord(candidate)) {
    record = candidate;
  }
  const id = toText(record.id) || `candidate-${index + 1}`;
  const title = toText(record.title) || id;

  return {
    id,
    title,
    productValue: toNumber(record.productValue),
    learningValue: toNumber(record.learningValue),
    userFeedbackValue: toNumber(record.userFeedbackValue),
    expectedTouchSet: toTextArray(record.expectedTouchSet),
    sharedTouchRisk: toNumber(record.sharedTouchRisk),
    expectedTestRefactorCollision: toNumber(
      record.expectedTestRefactorCollision
    ),
    expectedDeploymentRisk: toNumber(record.expectedDeploymentRisk),
  };
}

/**
 * Normalize active work into touch-set lookups.
 * @param {unknown[]} activeWork Raw active work records.
 * @returns {NormalizedActiveWork} Normalized active work sets.
 */
function normalizeActiveWork(activeWork) {
  const normalized = activeWork.map(item => normalizeActiveWorkItem(item));
  const touchSet = new Set();
  const reservedSurfaces = new Set();

  for (const item of normalized) {
    for (const path of item.touchSet) {
      touchSet.add(path);
    }
    for (const surface of item.reservedSurfaces) {
      reservedSurfaces.add(surface);
    }
  }

  return { touchSet, reservedSurfaces };
}

/**
 * Normalize one active-work item.
 * @param {unknown} item Raw active work record.
 * @returns {{ touchSet: string[], reservedSurfaces: string[] }} Normalized item.
 */
function normalizeActiveWorkItem(item) {
  /** @type {Record<string, unknown>} */
  let record = {};
  if (isRecord(item)) {
    record = item;
  }

  return {
    touchSet: toTextArray(record.touchSet),
    reservedSurfaces: toTextArray(record.reservedSurfaces),
  };
}

/**
 * Score a candidate against the current active work.
 * @param {SchedulerCandidate} candidate Normalized candidate.
 * @param {NormalizedActiveWork} activeWork Normalized active work sets.
 * @returns {{ id: string, title: string, score: number, penalties: Record<string, number>, reason: string }} Ranked candidate.
 */
function scoreCandidate(candidate, activeWork) {
  const expectedFileOverlap = countOverlap(
    candidate.expectedTouchSet,
    activeWork.touchSet
  );
  const expectedSharedInfrastructureTouch =
    candidate.sharedTouchRisk +
    countOverlap(candidate.expectedTouchSet, activeWork.reservedSurfaces);
  const expectedTestRefactorCollision = candidate.expectedTestRefactorCollision;
  const expectedDeploymentRisk = candidate.expectedDeploymentRisk;
  const value =
    candidate.productValue +
    candidate.learningValue +
    candidate.userFeedbackValue;
  const coordinationCost =
    expectedFileOverlap +
    expectedSharedInfrastructureTouch +
    expectedTestRefactorCollision +
    expectedDeploymentRisk;
  const score = value - coordinationCost;
  const penalties = {
    expectedFileOverlap,
    expectedSharedInfrastructureTouch,
    expectedTestRefactorCollision,
    expectedDeploymentRisk,
  };

  return {
    id: candidate.id,
    title: candidate.title,
    score,
    penalties,
    reason: buildReason(score, penalties),
  };
}

/**
 * Build a concise score explanation.
 * @param {number} score Final candidate score.
 * @param {{ expectedFileOverlap: number, expectedSharedInfrastructureTouch: number, expectedTestRefactorCollision: number, expectedDeploymentRisk: number }} penalties Penalty breakdown.
 * @returns {string} Human-readable reason string.
 */
function buildReason(score, penalties) {
  /** @type {string[]} */
  const details = [];

  appendPenaltyDetail(details, penalties.expectedFileOverlap, 'file overlap');
  appendPenaltyDetail(
    details,
    penalties.expectedSharedInfrastructureTouch,
    'shared-surface touch'
  );
  appendPenaltyDetail(
    details,
    penalties.expectedTestRefactorCollision,
    'test collision'
  );
  appendPenaltyDetail(
    details,
    penalties.expectedDeploymentRisk,
    'deployment risk'
  );

  if (details.length === 0) {
    details.push('no coordination penalties');
  }

  return `score ${score}; ${details.join(', ')}`;
}

/**
 * Add a penalty fragment when the penalty is non-zero.
 * @param {string[]} details Details list.
 * @param {number} penalty Penalty amount.
 * @param {string} label Penalty label.
 * @returns {void}
 */
function appendPenaltyDetail(details, penalty, label) {
  if (penalty <= 0) {
    return;
  }

  let countLabel = label;
  if (penalty !== 1) {
    countLabel = `${label}s`;
  }

  details.push(`${penalty} ${countLabel}`);
}

/**
 * Compare ranked candidates deterministically.
 * @param {{ score: number, id: string, title: string }} left Left candidate.
 * @param {{ score: number, id: string, title: string }} right Right candidate.
 * @returns {number} Sort order.
 */
function compareRankedCandidates(left, right) {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  const idOrder = left.id.localeCompare(right.id);
  if (idOrder !== 0) {
    return idOrder;
  }

  return left.title.localeCompare(right.title);
}

/**
 * Count how many candidate entries overlap a lookup set.
 * @param {string[]} values Candidate values.
 * @param {Set<string>} lookup Lookup values.
 * @returns {number} Overlap count.
 */
function countOverlap(values, lookup) {
  let count = 0;
  for (const value of new Set(values)) {
    if (lookup.has(value)) {
      count++;
    }
  }

  return count;
}

/**
 * Check whether a parsed value is an object record.
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, unknown>} True when the value is a non-array object.
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalize a parsed value into an array.
 * @param {unknown} value Candidate list value.
 * @returns {unknown[]} Array or empty list.
 */
function toArray(value) {
  /** @type {unknown[]} */
  const list = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      list.push(item);
    }
  }

  return list;
}

/**
 * Normalize a parsed value into text.
 * @param {unknown} value Candidate text value.
 * @returns {string} String or empty string.
 */
function toText(value) {
  if (typeof value === 'string') {
    return value;
  }

  return '';
}

/**
 * Normalize a parsed value into a numeric scalar.
 * @param {unknown} value Candidate numeric value.
 * @returns {number} Finite number or zero.
 */
function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return 0;
}

/**
 * Normalize a parsed value into a string array.
 * @param {unknown} value Candidate string array.
 * @returns {string[]} String array or empty list.
 */
function toTextArray(value) {
  /** @type {string[]} */
  const list = [];
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const item = value[index];
      if (typeof item === 'string') {
        list.push(item);
      }
    }
  }

  return list;
}
