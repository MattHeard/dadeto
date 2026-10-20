import {
  evaluateAlgZooRestrictedRule,
  scoreAlgZooBlindedSubmissions,
} from '../../../src/core/interpretability/algZooPilotHarness/index.js';

const sequenceCount = 1024;
const sequenceLength = 10;
const targetCount = 16;

/**
 * Build a deterministic synthetic evaluator dataset.
 * @param {(value: number, timeStep: number, unitIndex: number) => number} [activation] Activation fixture.
 * @param {(sequenceIndex: number, timeStep: number) => number} [input] Input fixture.
 * @returns {Record<string, any>} Complete held-out data contract.
 */
function createHeldOutData(
  activation = value => Math.max(0, value),
  input = (sequenceIndex, timeStep) =>
    ((sequenceIndex % 17) - 8) / 4 + timeStep / 20
) {
  const sequences = Array.from({ length: sequenceCount }, (_, sequenceIndex) =>
    Array.from({ length: sequenceLength }, (_, timeStep) =>
      input(sequenceIndex, timeStep)
    )
  );
  const activationsByUnit = Array.from(
    { length: targetCount },
    (_, unitIndex) =>
      sequences.map(sequence =>
        sequence.map((value, timeStep) =>
          activation(value, timeStep, unitIndex)
        )
      )
  );
  return { sequences, activationsByUnit };
}

const currentInputRule = {
  op: 'input',
  index: { op: 'time' },
};

describe('AlgZoo restricted prediction rules', () => {
  it('evaluates every allowed operator and inclusive prefixes', () => {
    const input = [-2, 1, 4, 3, -1, 0, 2, 5, 6, 7];
    const cases = [
      [{ op: 'constant', value: 2 }, 2],
      [{ op: 'time' }, 0],
      [{ op: 'input', index: { op: 'time' } }, -2],
      [
        {
          op: 'add',
          left: { op: 'constant', value: 2 },
          right: { op: 'constant', value: 3 },
        },
        5,
      ],
      [
        {
          op: 'subtract',
          left: { op: 'constant', value: 3 },
          right: { op: 'constant', value: 2 },
        },
        1,
      ],
      [
        {
          op: 'multiply',
          left: { op: 'constant', value: 2 },
          right: { op: 'constant', value: 3 },
        },
        6,
      ],
      [
        {
          op: 'divide',
          left: { op: 'constant', value: 6 },
          right: { op: 'constant', value: 3 },
        },
        2,
      ],
      [
        {
          op: 'max',
          left: { op: 'constant', value: 2 },
          right: { op: 'constant', value: 3 },
        },
        3,
      ],
      [
        {
          op: 'lessThan',
          left: { op: 'constant', value: 2 },
          right: { op: 'constant', value: 3 },
        },
        1,
      ],
      [
        {
          op: 'lessThan',
          left: { op: 'constant', value: 3 },
          right: { op: 'constant', value: 2 },
        },
        0,
      ],
      [
        {
          op: 'lessThanOrEqual',
          left: { op: 'constant', value: 3 },
          right: { op: 'constant', value: 3 },
        },
        1,
      ],
      [
        {
          op: 'lessThanOrEqual',
          left: { op: 'constant', value: 4 },
          right: { op: 'constant', value: 3 },
        },
        0,
      ],
      [
        {
          op: 'greaterThan',
          left: { op: 'constant', value: 4 },
          right: { op: 'constant', value: 3 },
        },
        1,
      ],
      [
        {
          op: 'greaterThan',
          left: { op: 'constant', value: 2 },
          right: { op: 'constant', value: 3 },
        },
        0,
      ],
      [
        {
          op: 'greaterThanOrEqual',
          left: { op: 'constant', value: 3 },
          right: { op: 'constant', value: 3 },
        },
        1,
      ],
      [
        {
          op: 'greaterThanOrEqual',
          left: { op: 'constant', value: 2 },
          right: { op: 'constant', value: 3 },
        },
        0,
      ],
      [
        {
          op: 'equal',
          left: { op: 'constant', value: 2 },
          right: { op: 'constant', value: 2 },
        },
        1,
      ],
      [
        {
          op: 'equal',
          left: { op: 'constant', value: 2 },
          right: { op: 'constant', value: 3 },
        },
        0,
      ],
      [{ op: 'negate', value: { op: 'constant', value: 2 } }, -2],
      [{ op: 'relu', value: { op: 'constant', value: -2 } }, 0],
      [{ op: 'prefixSum' }, -2],
      [{ op: 'prefixMean' }, -2],
      [{ op: 'prefixMax' }, -2],
      [{ op: 'prefixMin' }, -2],
    ];
    const nullPrototypeRule = Object.assign(Object.create(null), {
      op: 'constant',
      value: 7,
    });

    for (const [rule, expected] of cases) {
      const result = evaluateAlgZooRestrictedRule(rule, input);
      expect(result.valid).toBe(true);
      expect(result.predictions[0]).toBe(expected);
    }
    expect(
      evaluateAlgZooRestrictedRule({ op: 'prefixSum' }, input).predictions[2]
    ).toBe(3);
    expect(
      evaluateAlgZooRestrictedRule({ op: 'prefixMean' }, input).predictions[2]
    ).toBe(1);
    expect(
      evaluateAlgZooRestrictedRule({ op: 'prefixMax' }, input).predictions[2]
    ).toBe(4);
    expect(
      evaluateAlgZooRestrictedRule({ op: 'prefixMin' }, input).predictions[2]
    ).toBe(-2);
    expect(
      evaluateAlgZooRestrictedRule(nullPrototypeRule, input).predictions
    ).toEqual(Array(10).fill(7));
  });

  it('retains malformed, unsafe, and over-limit rules as failed attempts', () => {
    const tooManyNodes = Array.from({ length: 64 }, () => null).reduce(
      rule => ({ op: 'negate', value: rule }),
      { op: 'constant', value: 1 }
    );
    const validLimit = Array.from({ length: 63 }, () => null).reduce(
      rule => ({ op: 'negate', value: rule }),
      { op: 'constant', value: 1 }
    );
    const cyclic = { op: 'negate' };
    cyclic.value = cyclic;
    const customPrototypeRule = Object.assign(new (class Rule {})(), {
      op: 'constant',
      value: 7,
    });
    const symbolPropertyRule = { op: 'time' };
    symbolPropertyRule[Symbol('unexpected')] = true;
    const throwingGetterRule = {};
    Object.defineProperty(throwingGetterRule, 'op', {
      enumerable: true,
      get() {
        throw new Error('not-json');
      },
    });
    const cases = [
      [[], 'malformed-rule-node'],
      [{ op: 'unknown' }, 'unsupported-rule-operator'],
      [{ op: 'time', extra: true }, 'invalid-rule-fields'],
      [{ op: 'constant' }, 'invalid-rule-fields'],
      [{ op: 'constant', value: Number.POSITIVE_INFINITY }, 'invalid-constant'],
      [customPrototypeRule, 'malformed-rule-node'],
      [symbolPropertyRule, 'invalid-rule-fields'],
      [
        {
          op: 'divide',
          left: { op: 'constant', value: 1 },
          right: { op: 'constant', value: 0 },
        },
        'division-by-zero',
      ],
      [
        {
          op: 'multiply',
          left: { op: 'constant', value: Number.MAX_VALUE },
          right: { op: 'constant', value: 2 },
        },
        'non-finite-intermediate',
      ],
      [
        { op: 'input', index: { op: 'constant', value: 1 } },
        'input-index-out-of-prefix',
      ],
      [
        { op: 'input', index: { op: 'constant', value: 0.5 } },
        'input-index-out-of-prefix',
      ],
      [cyclic, 'cyclic-rule'],
      [tooManyNodes, 'rule-exceeds-node-limit'],
    ];

    for (const [rule, code] of cases) {
      expect(evaluateAlgZooRestrictedRule(rule, Array(10).fill(1))).toEqual({
        valid: false,
        errors: [{ code }],
      });
    }
    const validResult = evaluateAlgZooRestrictedRule(
      validLimit,
      Array(10).fill(1)
    );
    expect(validResult.valid).toBe(true);
    expect(validResult.predictions).toHaveLength(10);
    expect(
      evaluateAlgZooRestrictedRule(throwingGetterRule, Array(10).fill(1))
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-rule-evaluation' }],
    });
    expect(
      evaluateAlgZooRestrictedRule({ op: 'prefixSum' }, [
        Number.MAX_VALUE,
        Number.MAX_VALUE,
        ...Array(8).fill(0),
      ])
    ).toEqual({
      valid: false,
      errors: [{ code: 'non-finite-intermediate' }],
    });
    expect(evaluateAlgZooRestrictedRule(currentInputRule, [1])).toEqual({
      valid: false,
      errors: [{ code: 'invalid-input-sequence' }],
    });
    expect(
      evaluateAlgZooRestrictedRule(currentInputRule, [NaN, ...Array(9).fill(0)])
    ).toEqual({ valid: false, errors: [{ code: 'invalid-input-sequence' }] });
  });
});

describe('AlgZoo deterministic held-out scoring', () => {
  it('scores 1,024 ten-step sequences without mixing scores with hypotheses or causal evidence', () => {
    const heldOut = createHeldOutData((value, _timeStep, unitIndex) =>
      unitIndex === 2 ? Math.max(0, value) : Math.max(0, value + unitIndex)
    );
    const results = scoreAlgZooBlindedSubmissions(
      [
        {
          targetUnit: 2,
          restrictedRule: { op: 'relu', value: currentInputRule },
          hypothesis: 'post-hoc hypothesis text',
          causalEvidence: { status: 'not-tested' },
          causalInterventionResult: { status: 'not-tested' },
        },
        { targetUnit: 2, restrictedRule: { op: 'constant', value: 0 } },
        {
          targetUnit: 2,
          restrictedRule: {
            op: 'divide',
            left: { op: 'constant', value: 1 },
            right: { op: 'constant', value: 0 },
          },
        },
        { targetUnit: 16, restrictedRule: currentInputRule },
      ],
      heldOut
    );

    expect(results[0]).toMatchObject({
      targetUnit: 2,
      predictionStatus: 'scored',
      predictionMetrics: {
        candidateMse: 0,
        normalizedRmse: 0,
        passesPredictionThresholds: true,
      },
    });
    expect(results[0].predictionMetrics.perStepNormalizedRmse).toEqual(
      Array(10).fill(0)
    );
    expect(results[0]).not.toHaveProperty('hypothesis');
    expect(results[0]).not.toHaveProperty('causalEvidence');
    expect(results[0]).not.toHaveProperty('causalInterventionResult');
    expect(results[1]).toMatchObject({
      targetUnit: 2,
      predictionStatus: 'scored',
      predictionMetrics: { passesPredictionThresholds: false },
    });
    expect(results[2]).toMatchObject({
      targetUnit: 2,
      predictionStatus: 'invalid',
      errors: [{ code: 'division-by-zero' }],
    });
    expect(results[3]).toMatchObject({
      targetUnit: 16,
      predictionStatus: 'invalid',
      errors: [{ code: 'invalid-target-unit' }],
    });
  });

  it('applies aggregate, per-step, and constant-mean thresholds independently', () => {
    const offsetAtOneStep = createHeldOutData(
      (value, timeStep) => value + (timeStep === 0 ? 0.3 : 0),
      sequenceIndex => (sequenceIndex - 511.5) / 300
    );
    const perStepFailure = scoreAlgZooBlindedSubmissions(
      [{ targetUnit: 0, restrictedRule: currentInputRule }],
      offsetAtOneStep
    )[0].predictionMetrics;
    expect(perStepFailure.normalizedRmse).toBeLessThanOrEqual(0.1);
    expect(perStepFailure.perStepNormalizedRmse[0]).toBeGreaterThan(0.25);
    expect(perStepFailure.constantMeanMseReduction).toBeGreaterThanOrEqual(0.9);
    expect(perStepFailure.passesPredictionThresholds).toBe(false);

    const aggregateFailure = scoreAlgZooBlindedSubmissions(
      [{ targetUnit: 0, restrictedRule: currentInputRule }],
      createHeldOutData(
        value => value + 0.11,
        sequenceIndex => (sequenceIndex - 511.5) / 300
      )
    )[0].predictionMetrics;
    expect(aggregateFailure.normalizedRmse).toBeGreaterThan(0.1);
    expect(
      aggregateFailure.perStepNormalizedRmse.every(value => value <= 0.25)
    ).toBe(true);
    expect(aggregateFailure.constantMeanMseReduction).toBeGreaterThanOrEqual(
      0.9
    );
    expect(aggregateFailure.passesPredictionThresholds).toBe(false);

    const baselineFailure = scoreAlgZooBlindedSubmissions(
      [{ targetUnit: 0, restrictedRule: currentInputRule }],
      createHeldOutData(
        value => value + 0.0005,
        sequenceIndex => (sequenceIndex - 511.5) / 500000
      )
    )[0].predictionMetrics;
    expect(baselineFailure.normalizedRmse).toBeLessThanOrEqual(0.1);
    expect(
      baselineFailure.perStepNormalizedRmse.every(value => value <= 0.25)
    ).toBe(true);
    expect(baselineFailure.constantMeanMseReduction).toBeLessThan(0.9);
    expect(baselineFailure.passesPredictionThresholds).toBe(false);

    const zeroVariance = scoreAlgZooBlindedSubmissions(
      [{ targetUnit: 0, restrictedRule: { op: 'constant', value: 0 } }],
      createHeldOutData(
        () => 0,
        () => 0
      )
    )[0].predictionMetrics;
    expect(zeroVariance).toMatchObject({
      constantMeanMse: 0,
      constantMeanMseReduction: 1,
      passesPredictionThresholds: true,
    });
  });

  it('rejects malformed held-out datasets and non-array submissions', () => {
    const heldOut = createHeldOutData();
    const invalidSets = [
      null,
      { ...heldOut, extra: true },
      { ...heldOut, sequences: heldOut.sequences.slice(1) },
      {
        ...heldOut,
        sequences: [[...Array(9).fill(0)], ...heldOut.sequences.slice(1)],
      },
      {
        ...heldOut,
        activationsByUnit: heldOut.activationsByUnit.slice(1),
      },
      {
        ...heldOut,
        activationsByUnit: heldOut.activationsByUnit.map((matrix, index) =>
          index === 0 ? matrix.slice(1) : matrix
        ),
      },
      {
        ...heldOut,
        activationsByUnit: heldOut.activationsByUnit.map((matrix, unitIndex) =>
          unitIndex === 0 ? [[...Array(9).fill(0)], ...matrix.slice(1)] : matrix
        ),
      },
      {
        ...heldOut,
        activationsByUnit: heldOut.activationsByUnit.map((matrix, unitIndex) =>
          unitIndex === 0
            ? [[NaN, ...Array(9).fill(0)], ...matrix.slice(1)]
            : matrix
        ),
      },
    ];
    for (const invalidSet of invalidSets) {
      expect(() => scoreAlgZooBlindedSubmissions([], invalidSet)).toThrow(
        TypeError
      );
    }
    expect(() => scoreAlgZooBlindedSubmissions(null, heldOut)).toThrow(
      TypeError
    );
  });
});
