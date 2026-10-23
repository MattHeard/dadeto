const TARGET_ORDER = [5, 3, 12, 8, 0, 15, 1, 9, 2, 13, 4, 14, 7, 10, 6, 11];
const COVERAGE = [
  0,
  0,
  0,
  1 / 16,
  1 / 16,
  2 / 16,
  2 / 16,
  3 / 16,
  3 / 16,
  4 / 16,
  5 / 16,
  5 / 16,
  6 / 16,
  7 / 16,
  8 / 16,
  9 / 16,
];
const METRICS = [
  'investigatorTokens',
  'elapsedMillis',
  'toolCalls',
  'targetForwardPasses',
];

/**
 * Create synthetic 16-pair input for deterministic report tests only.
 * @returns {Record<string, any>} Valid locked-pair analysis input.
 */
export function createAlgZooCoverageCostInput() {
  return {
    protocolVersion: '1.0.4',
    bootstrapSeed: 9173,
    bootstrapReplicateCount: 10000,
    pairs: TARGET_ORDER.map((targetId, index) => ({
      targetId,
      mapCoverage: COVERAGE[index],
      control: createArm(index, 'control'),
      treatment: createArm(index, 'treatment'),
    })),
  };
}

/**
 * Create a synthetic arm with positive metered costs.
 * @param {number} index Pair index.
 * @param {string} armName Control or treatment.
 * @returns {Record<string, any>} Synthetic arm record.
 */
function createArm(index, armName) {
  const multiplier = armName === 'treatment' ? 1.1 + index / 100 : 1;
  const baseCost = {
    investigatorTokens: 100 + index * 10,
    elapsedMillis: 1000 + index * 100,
    toolCalls: 10 + index,
    targetForwardPasses: 100 + index * 20,
  };
  return {
    attemptStatus: index === 0 ? 'failed' : 'validated',
    costMeasurementStatus: 'complete',
    chargedCost: Object.fromEntries(
      METRICS.map(metric => [metric, Math.round(baseCost[metric] * multiplier)])
    ),
  };
}
