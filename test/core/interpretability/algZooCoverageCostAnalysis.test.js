import { analyzeAlgZooCoverageCostTrendV1 } from '../../../src/core/interpretability/algZooCoverageCostAnalysis/index.js';

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
 * Create locked synthetic pair records for unit tests only.
 * @returns {Record<string, any>} Valid analysis input.
 */
function createInput() {
  return {
    protocolVersion: '1.1',
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
 * Create one synthetic arm with positive metered costs.
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

/**
 * Independently calculate a least-squares slope for an expected-value check.
 * @param {Array<Record<string, any>>} pairs Pair rows.
 * @param {string} metric Cost metric.
 * @returns {number} Expected OLS slope.
 */
function expectedSlope(pairs, metric) {
  const values = pairs.map(pair => ({
    x: pair.mapCoverage,
    y:
      Math.log(pair.treatment.chargedCost[metric]) -
      Math.log(pair.control.chargedCost[metric]),
  }));
  const meanX = values.reduce((total, row) => total + row.x, 0) / values.length;
  const meanY = values.reduce((total, row) => total + row.y, 0) / values.length;
  const covariance = values.reduce(
    (total, row) => total + (row.x - meanX) * (row.y - meanY),
    0
  );
  const variance = values.reduce(
    (total, row) => total + (row.x - meanX) ** 2,
    0
  );
  return covariance / variance;
}

describe('AlgZoo preregistered coverage-cost analysis', () => {
  it('computes separate slopes and deterministic paired bootstrap intervals', () => {
    const input = createInput();
    const originalInput = structuredClone(input);
    const first = analyzeAlgZooCoverageCostTrendV1(input);
    const second = analyzeAlgZooCoverageCostTrendV1(input);

    expect(first.valid).toBe(true);
    if (!first.valid || !second.valid) return;
    expect(first.analysis).toEqual(second.analysis);
    expect(input).toEqual(originalInput);
    expect(first.analysis.pairCount).toBe(16);
    expect(first.analysis.bootstrap).toMatchObject({
      method: 'target-paired percentile bootstrap',
      replicateCount: 10000,
      seed: 9173,
      confidenceLevel: 0.95,
    });
    expect(first.analysis.interpretation).toContain(
      'Exploratory association only'
    );
    expect(first.analysis.pairs.map(pair => pair.targetId)).toEqual(
      TARGET_ORDER
    );
    expect(first.analysis.pairs[0].control.attemptStatus).toBe('failed');
    expect(first.analysis.pairs[0].treatment.attemptStatus).toBe('failed');
    expect(first.analysis.trends).toHaveLength(METRICS.length);
    expect(first.analysis.trends.map(trend => trend.metric)).toEqual(METRICS);
    for (const trend of first.analysis.trends) {
      expect(trend.status).toBe('measured');
      expect(trend.pairs).toHaveLength(16);
      expect(trend.validBootstrapReplicates).toBeGreaterThan(0);
      expect(trend.validBootstrapReplicates).toBeLessThanOrEqual(10000);
    }

    const tokenTrend = first.analysis.trends.find(
      trend => trend.metric === 'investigatorTokens'
    );
    expect(tokenTrend).toMatchObject({
      status: 'measured',
      validBootstrapReplicates: expect.any(Number),
    });
    expect(tokenTrend.slope).toBeCloseTo(
      expectedSlope(input.pairs, 'investigatorTokens'),
      12
    );
    expect(tokenTrend.interval.lower).toBeLessThanOrEqual(
      tokenTrend.interval.upper
    );
    expect(tokenTrend.pairs).toHaveLength(16);
    expect(tokenTrend.pairs[0]).toMatchObject({
      targetId: TARGET_ORDER[0],
      mapCoverage: COVERAGE[0],
      status: 'measured',
      logCostDifference: expect.any(Number),
    });
  });

  it('retains all pair rows and marks incomplete cost dimensions not estimable', () => {
    const input = createInput();
    input.pairs[4].treatment.costMeasurementStatus = 'partial';
    const result = analyzeAlgZooCoverageCostTrendV1(input);

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    const tokens = result.analysis.trends.find(
      trend => trend.metric === 'investigatorTokens'
    );
    const elapsed = result.analysis.trends.find(
      trend => trend.metric === 'elapsedMillis'
    );
    expect(tokens).toMatchObject({
      status: 'not-estimable',
      reason: 'incomplete-pair-costs',
      pairs: expect.arrayContaining([
        expect.objectContaining({
          targetId: input.pairs[4].targetId,
          status: 'not-estimable',
          reason: 'partial-cost-measurement',
          logCostDifference: null,
        }),
      ]),
    });
    expect(tokens.pairs).toHaveLength(16);
    expect(elapsed.status).toBe('not-estimable');
  });

  it('reports zero resource costs without turning them into log outcomes', () => {
    const input = createInput();
    input.pairs[2].control.chargedCost.toolCalls = 0;
    const result = analyzeAlgZooCoverageCostTrendV1(input);

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    const calls = result.analysis.trends.find(
      trend => trend.metric === 'toolCalls'
    );
    const tokens = result.analysis.trends.find(
      trend => trend.metric === 'investigatorTokens'
    );
    expect(calls).toMatchObject({
      status: 'not-estimable',
      reason: 'incomplete-pair-costs',
      pairs: expect.arrayContaining([
        expect.objectContaining({
          targetId: input.pairs[2].targetId,
          status: 'not-estimable',
          reason: 'nonpositive-cost',
          controlCost: 0,
          logCostDifference: null,
        }),
      ]),
    });
    expect(tokens.status).toBe('measured');
  });

  it('reports a constant coverage model as not estimable while retaining pairs', () => {
    const input = createInput();
    input.pairs = input.pairs.map(pair => ({ ...pair, mapCoverage: 0 }));
    const result = analyzeAlgZooCoverageCostTrendV1(input);

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.analysis.trends[0]).toMatchObject({
      status: 'not-estimable',
      reason: 'coverage-does-not-vary',
      pairs: expect.arrayContaining([
        expect.objectContaining({ status: 'measured' }),
      ]),
    });
    expect(result.analysis.trends[0].pairs).toHaveLength(16);
  });

  it('reports a degenerate bootstrap interval as not estimable', () => {
    const input = createInput();
    input.bootstrapSeed = 1;
    input.bootstrapReplicateCount = 1;
    input.pairs = input.pairs.map((pair, index) => ({
      ...pair,
      mapCoverage: index === 15 ? 1 / 16 : 0,
    }));
    const result = analyzeAlgZooCoverageCostTrendV1(input);

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.analysis.trends[0]).toMatchObject({
      status: 'not-estimable',
      reason: 'no-estimable-bootstrap-replicates',
      pairs: expect.arrayContaining([
        expect.objectContaining({ status: 'measured' }),
      ]),
    });
  });

  it('rejects malformed inputs, pair order, coverage, and arm costs', () => {
    expect(analyzeAlgZooCoverageCostTrendV1(null)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-analysis-input' }],
    });
    expect(analyzeAlgZooCoverageCostTrendV1({})).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-analysis-metadata' }],
    });

    const input = createInput();
    expect(
      analyzeAlgZooCoverageCostTrendV1({ ...input, bootstrapSeed: 0 })
    ).toMatchObject({ errors: [{ code: 'invalid-bootstrap-seed' }] });
    expect(
      analyzeAlgZooCoverageCostTrendV1({ ...input, bootstrapReplicateCount: 0 })
    ).toMatchObject({
      errors: [{ code: 'invalid-bootstrap-replicate-count' }],
    });
    expect(
      analyzeAlgZooCoverageCostTrendV1({
        ...input,
        pairs: input.pairs.slice(1),
      })
    ).toMatchObject({ errors: [{ code: 'invalid-analysis-metadata' }] });
    expect(
      analyzeAlgZooCoverageCostTrendV1({
        ...input,
        pairs: input.pairs.map((pair, index) => (index === 0 ? null : pair)),
      })
    ).toMatchObject({ errors: [{ code: 'invalid-pair', index: 0 }] });
    expect(
      analyzeAlgZooCoverageCostTrendV1({
        ...input,
        pairs: input.pairs.map((pair, index) =>
          index === 0 ? { ...pair, targetId: input.pairs[1].targetId } : pair
        ),
      })
    ).toMatchObject({ errors: [{ code: 'invalid-target-id', index: 1 }] });
    expect(
      analyzeAlgZooCoverageCostTrendV1({
        ...input,
        pairs: input.pairs.map((pair, index) =>
          index === 0 ? { ...pair, mapCoverage: 1 / 32 } : pair
        ),
      })
    ).toMatchObject({ errors: [{ code: 'invalid-map-coverage', index: 0 }] });
    expect(
      analyzeAlgZooCoverageCostTrendV1({
        ...input,
        pairs: input.pairs.map((pair, index) =>
          index === 4 ? { ...pair, mapCoverage: 0 } : pair
        ),
      })
    ).toMatchObject({ errors: [{ code: 'invalid-map-coverage', index: 4 }] });
    expect(
      analyzeAlgZooCoverageCostTrendV1({
        ...input,
        pairs: input.pairs.map((pair, index) =>
          index === 0 ? { ...pair, control: null } : pair
        ),
      })
    ).toMatchObject({ errors: [{ code: 'invalid-control-arm', index: 0 }] });
    expect(
      analyzeAlgZooCoverageCostTrendV1({
        ...input,
        pairs: input.pairs.map((pair, index) =>
          index === 0 ? { ...pair, treatment: null } : pair
        ),
      })
    ).toMatchObject({ errors: [{ code: 'invalid-treatment-arm', index: 0 }] });
    expect(
      analyzeAlgZooCoverageCostTrendV1({
        ...input,
        pairs: input.pairs.map((pair, index) =>
          index === 0
            ? {
                ...pair,
                control: {
                  ...pair.control,
                  chargedCost: {
                    ...pair.control.chargedCost,
                    investigatorTokens: Number.NaN,
                  },
                },
              }
            : pair
        ),
      })
    ).toMatchObject({ errors: [{ code: 'invalid-control-cost', index: 0 }] });
    expect(
      analyzeAlgZooCoverageCostTrendV1({
        ...input,
        pairs: input.pairs.map((pair, index) =>
          index === 0
            ? {
                ...pair,
                treatment: {
                  ...pair.treatment,
                  chargedCost: {
                    ...pair.treatment.chargedCost,
                    elapsedMillis: -1,
                  },
                },
              }
            : pair
        ),
      })
    ).toMatchObject({ errors: [{ code: 'invalid-treatment-cost', index: 0 }] });
  });
});
