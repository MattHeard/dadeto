import {
  createValidationError,
  isNonnegativeFinite,
  isRecord,
} from '../algZooValidation/index.js';

const TARGET_COUNT = 16;
const MAX_BOOTSTRAP_REPLICATE_COUNT = 100000;
export const ALG_ZOO_COVERAGE_COST_RESOURCE_METRICS = Object.freeze([
  'investigatorTokens',
  'elapsedMillis',
  'toolCalls',
  'targetForwardPasses',
]);

/**
 * Analyze the preregistered exploratory relationship between prior validated
 * map coverage and paired treatment-control resource costs.
 *
 * Costs must already include every attempt charged to the target pair by the
 * frozen protocol. Failed and contaminated pairs remain in the output.
 * @param {unknown} input Locked pair records and the manifest bootstrap seed.
 * @returns {{valid: true, analysis: Record<string, any>}|{valid: false, errors: Array<{code: string, index?: number}>}} Analysis or stable validation errors.
 */
export function analyzeAlgZooCoverageCostTrendV1(input) {
  const errors = validateInput(input);
  if (errors.length > 0) return { valid: false, errors };

  const records = /** @type {Record<string, any>} */ (input);
  const pairs = /** @type {Array<Record<string, any>>} */ (records.pairs);
  const trends = ALG_ZOO_COVERAGE_COST_RESOURCE_METRICS.map(metric =>
    analyzeResourceTrend(
      pairs,
      metric,
      records.bootstrapSeed,
      records.bootstrapReplicateCount
    )
  );
  return {
    valid: true,
    analysis: {
      protocolVersion: records.protocolVersion,
      pairCount: TARGET_COUNT,
      interpretation:
        'Exploratory association only; sequential coverage is confounded with target order and accumulated practice.',
      bootstrap: {
        method: 'target-paired percentile bootstrap',
        replicateCount: records.bootstrapReplicateCount,
        seed: records.bootstrapSeed,
        confidenceLevel: 0.95,
      },
      pairs: pairs.map(pair => ({
        targetId: pair.targetId,
        mapCoverage: pair.mapCoverage,
        control: copyArmRecord(pair.control),
        treatment: copyArmRecord(pair.treatment),
      })),
      trends,
    },
  };
}

/**
 * Validate pair order, coverage, arm records, and manifest seed.
 * @param {unknown} input Candidate analysis input.
 * @returns {Array<{code: string, index?: number}>} Stable validation errors.
 */
function validateInput(input) {
  if (!isRecord(input)) return createValidationError('invalid-analysis-input');
  if (
    typeof input.protocolVersion !== 'string' ||
    input.protocolVersion.trim() === '' ||
    !Array.isArray(input.pairs) ||
    input.pairs.length !== TARGET_COUNT
  ) {
    return createValidationError('invalid-analysis-metadata');
  }
  if (
    !Number.isInteger(input.bootstrapSeed) ||
    input.bootstrapSeed <= 0 ||
    input.bootstrapSeed > 0xffffffff
  ) {
    return createValidationError('invalid-bootstrap-seed');
  }
  if (
    !Number.isInteger(input.bootstrapReplicateCount) ||
    input.bootstrapReplicateCount < 1 ||
    input.bootstrapReplicateCount > MAX_BOOTSTRAP_REPLICATE_COUNT
  ) {
    return createValidationError('invalid-bootstrap-replicate-count');
  }

  const seenTargetIds = new Set();
  let previousCoverage = -1;
  for (let index = 0; index < input.pairs.length; index += 1) {
    const pair = input.pairs[index];
    if (!isRecord(pair)) return createValidationError('invalid-pair', index);
    if (
      !Number.isInteger(pair.targetId) ||
      pair.targetId < 0 ||
      pair.targetId >= TARGET_COUNT ||
      seenTargetIds.has(pair.targetId)
    ) {
      return createValidationError('invalid-target-id', index);
    }
    seenTargetIds.add(pair.targetId);
    if (
      !Number.isFinite(pair.mapCoverage) ||
      pair.mapCoverage < 0 ||
      pair.mapCoverage > 1 ||
      !Number.isInteger(pair.mapCoverage * TARGET_COUNT) ||
      pair.mapCoverage < previousCoverage
    ) {
      return createValidationError('invalid-map-coverage', index);
    }
    previousCoverage = pair.mapCoverage;

    const armErrors = validateArm(pair.control, index, 'control');
    if (armErrors.length > 0) return armErrors;
    const treatmentErrors = validateArm(pair.treatment, index, 'treatment');
    if (treatmentErrors.length > 0) return treatmentErrors;
  }
  return [];
}

/**
 * Validate one arm's status and charged resource vector.
 * @param {unknown} value Candidate arm.
 * @param {number} index Pair index.
 * @param {string} armName Arm label.
 * @returns {Array<{code: string, index?: number}>} Stable validation errors.
 */
function validateArm(value, index, armName) {
  if (
    !isRecord(value) ||
    typeof value.attemptStatus !== 'string' ||
    value.attemptStatus.trim() === '' ||
    !['complete', 'partial'].includes(value.costMeasurementStatus) ||
    !isRecord(value.chargedCost)
  ) {
    return createValidationError(`invalid-${armName}-arm`, index);
  }
  const invalidMetric = ALG_ZOO_COVERAGE_COST_RESOURCE_METRICS.find(
    metric => !isNonnegativeFinite(value.chargedCost[metric])
  );
  return invalidMetric
    ? createValidationError(`invalid-${armName}-cost`, index)
    : [];
}

/**
 * Compute a separate log-cost slope for one metered resource dimension.
 * @param {Array<Record<string, any>>} pairs Ordered target-pair records.
 * @param {string} metric Resource dimension.
 * @param {number} seed Manifest-provided bootstrap seed.
 * @param {number} replicateCount Bootstrap replicate count pinned in the manifest.
 * @returns {Record<string, any>} Trend, interval, and all target-pair rows.
 */
function analyzeResourceTrend(pairs, metric, seed, replicateCount) {
  const observations = pairs.map(pair => {
    const controlCost = pair.control.chargedCost[metric];
    const treatmentCost = pair.treatment.chargedCost[metric];
    const reason = getUnestimableReason(pair, controlCost, treatmentCost);
    return {
      targetId: pair.targetId,
      mapCoverage: pair.mapCoverage,
      controlCost,
      treatmentCost,
      logCostDifference:
        reason === null
          ? Math.log(treatmentCost) - Math.log(controlCost)
          : null,
      status: reason === null ? 'measured' : 'not-estimable',
      ...(reason === null ? {} : { reason }),
    };
  });
  const reason = getTrendUnestimableReason(observations);
  if (reason !== null) {
    return { metric, status: 'not-estimable', reason, pairs: observations };
  }

  const slope = calculateSlope(observations);
  const bootstrapSlopes = createBootstrapSlopes(
    observations,
    seed,
    replicateCount
  );
  if (bootstrapSlopes.length === 0) {
    return {
      metric,
      status: 'not-estimable',
      reason: 'no-estimable-bootstrap-replicates',
      pairs: observations,
    };
  }
  const interval = percentileInterval(bootstrapSlopes);
  return {
    metric,
    status: 'measured',
    slope,
    interval,
    validBootstrapReplicates: bootstrapSlopes.length,
    pairs: observations,
  };
}

/**
 * Find why a paired resource measurement cannot be logged.
 * @param {Record<string, any>} pair Target pair.
 * @param {number} controlCost Control charged cost.
 * @param {number} treatmentCost Treatment charged cost.
 * @returns {string|null} A stable reason or null when both costs are complete and positive.
 */
function getUnestimableReason(pair, controlCost, treatmentCost) {
  if (
    pair.control.costMeasurementStatus !== 'complete' ||
    pair.treatment.costMeasurementStatus !== 'complete'
  ) {
    return 'partial-cost-measurement';
  }
  if (controlCost <= 0 || treatmentCost <= 0) return 'nonpositive-cost';
  return null;
}

/**
 * Find why a trend cannot be estimated without dropping target pairs.
 * @param {Array<Record<string, any>>} observations All pair observations.
 * @returns {string|null} Stable reason or null when regression is estimable.
 */
function getTrendUnestimableReason(observations) {
  if (observations.some(row => row.status !== 'measured')) {
    return 'incomplete-pair-costs';
  }
  const firstCoverage = observations[0]?.mapCoverage;
  if (observations.every(row => row.mapCoverage === firstCoverage)) {
    return 'coverage-does-not-vary';
  }
  return null;
}

/**
 * Calculate the ordinary-least-squares slope against pre-pair map coverage.
 * @param {Array<Record<string, any>>} observations Measured pair observations.
 * @returns {number} Slope of treatment-minus-control log cost.
 */
function calculateSlope(observations) {
  let meanX = 0;
  let meanY = 0;
  for (const row of observations) {
    meanX += row.mapCoverage;
    meanY += row.logCostDifference;
  }
  meanX /= observations.length;
  meanY /= observations.length;

  let covariance = 0;
  let variance = 0;
  for (const row of observations) {
    const xDifference = row.mapCoverage - meanX;
    covariance += xDifference * (row.logCostDifference - meanY);
    variance += xDifference ** 2;
  }
  return covariance / variance;
}

/**
 * Generate a target-paired percentile-bootstrap distribution.
 * @param {Array<Record<string, any>>} observations Measured pair observations.
 * @param {number} seed Manifest-provided bootstrap seed.
 * @param {number} replicateCount Bootstrap replicates to generate.
 * @returns {Array<number>} Defined bootstrap slopes in replicate order.
 */
function createBootstrapSlopes(observations, seed, replicateCount) {
  const random = createSeededRandom(seed);
  const slopes = [];
  for (let replicate = 0; replicate < replicateCount; replicate += 1) {
    const sample = [];
    for (let index = 0; index < TARGET_COUNT; index += 1) {
      sample.push(observations[Math.floor(random() * TARGET_COUNT)]);
    }
    if (hasCoverageVariation(sample)) slopes.push(calculateSlope(sample));
  }
  return slopes;
}

/**
 * Determine whether a bootstrap sample supports a finite regression slope.
 * @param {Array<Record<string, any>>} sample Resampled target pairs.
 * @returns {boolean} Whether the coverage predictor varies.
 */
function hasCoverageVariation(sample) {
  const firstCoverage = sample[0]?.mapCoverage;
  return sample.some(row => row.mapCoverage !== firstCoverage);
}

/**
 * Create a deterministic uniform random generator for bootstrap sampling.
 * @param {number} seed Nonzero unsigned 32-bit seed.
 * @returns {() => number} Uniform value in [0, 1).
 */
function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

/**
 * Return a linearly interpolated two-sided percentile interval.
 * @param {Array<number>} values Bootstrap slopes.
 * @returns {{lower: number, upper: number}} Central 95% interval.
 */
function percentileInterval(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return {
    lower: quantile(sorted, 0.025),
    upper: quantile(sorted, 0.975),
  };
}

/**
 * Calculate a linearly interpolated empirical quantile.
 * @param {Array<number>} sorted Ascending numeric values.
 * @param {number} probability Quantile probability in [0, 1].
 * @returns {number} Empirical quantile.
 */
function quantile(sorted, probability) {
  const position = (sorted.length - 1) * probability;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const fraction = position - lowerIndex;
  return (
    sorted[lowerIndex] + (sorted[upperIndex] - sorted[lowerIndex]) * fraction
  );
}

/**
 * Copy the reviewed arm outcome and charged cost into the result.
 * @param {Record<string, any>} arm Locked arm record.
 * @returns {Record<string, any>} Stable output arm record.
 */
function copyArmRecord(arm) {
  return {
    attemptStatus: arm.attemptStatus,
    costMeasurementStatus: arm.costMeasurementStatus,
    chargedCost: Object.fromEntries(
      ALG_ZOO_COVERAGE_COST_RESOURCE_METRICS.map(metric => [
        metric,
        arm.chargedCost[metric],
      ])
    ),
  };
}

/**
 * Check for a non-array record.
 * @param {unknown} value Candidate record.
 * @returns {value is Record<string, any>} Whether value is a record.
 */
