const TARGET_COUNT = 16;
const HELD_OUT_SEQUENCE_COUNT = 1024;
const SEQUENCE_LENGTH = 10;
const MAX_RULE_NODES = 64;
const MINIMUM_SCALE = 0.01;
const BINARY_OPERATORS = new Set([
  'add',
  'subtract',
  'multiply',
  'divide',
  'max',
  'lessThan',
  'lessThanOrEqual',
  'greaterThan',
  'greaterThanOrEqual',
  'equal',
]);
const UNARY_OPERATORS = new Set(['negate', 'relu']);
const PREFIX_OPERATORS = new Set([
  'prefixSum',
  'prefixMean',
  'prefixMax',
  'prefixMin',
]);

/** @typedef {Array<Array<number>>} ActivationMatrix */
/** @typedef {{sequences: Array<Array<number>>, activationsByUnit: Array<ActivationMatrix>}} HeldOutEvaluationData */
/** @typedef {{sequence: Array<number>, timeStep: number, nodes: number, ancestors: Set<object>}} RuleEvaluationState */

class InvalidPredictionRuleError extends Error {
  /**
   * @param {string} code Stable prediction-rule failure code.
   */
  constructor(code) {
    super(code);
    this.name = 'InvalidPredictionRuleError';
    this.code = code;
  }
}

/**
 * Return a finite prediction or its stable failure code.
 * @param {number} value Numeric intermediate.
 * @returns {number} Finite numeric result.
 */
function requireFinitePrediction(value) {
  if (!Number.isFinite(value)) {
    throw new InvalidPredictionRuleError('non-finite-intermediate');
  }
  return value;
}

/**
 * Read a length-ten numeric sequence matrix or report no match.
 * @param {unknown} value Candidate matrix.
 * @returns {ActivationMatrix|null} Matrix with protocol shape, or null.
 */
function readEvaluationMatrix(value) {
  if (
    !Array.isArray(value) ||
    value.length !== HELD_OUT_SEQUENCE_COUNT ||
    !value.every(
      sequence =>
        Array.isArray(sequence) &&
        sequence.length === SEQUENCE_LENGTH &&
        sequence.every(Number.isFinite)
    )
  ) {
    return null;
  }
  return /** @type {ActivationMatrix} */ (value);
}

/**
 * Read one plain rule node or return a stable attempted-failure code.
 * @param {unknown} value Candidate syntax-tree node.
 * @returns {Record<string, any>} Plain rule node.
 */
function readRuleRecord(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidPredictionRuleError('malformed-rule-node');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new InvalidPredictionRuleError('malformed-rule-node');
  }
  return /** @type {Record<string, any>} */ (value);
}

/**
 * Validate that a rule node has exactly its allowed fields.
 * @param {Record<string, any>} node Rule AST node.
 * @param {Array<string>} expectedFields Allowed own-property names.
 * @returns {void}
 */
function requireExactFields(node, expectedFields) {
  const actualFields = Reflect.ownKeys(node);
  if (actualFields.some(field => typeof field !== 'string')) {
    throw new InvalidPredictionRuleError('invalid-rule-fields');
  }
  actualFields.sort();
  const sortedExpected = [...expectedFields].sort();
  if (
    actualFields.length !== sortedExpected.length ||
    actualFields.some((field, index) => field !== sortedExpected[index])
  ) {
    throw new InvalidPredictionRuleError('invalid-rule-fields');
  }
}

/**
 * Apply one protocol-v1.0.3 arithmetic operator.
 * @param {string} operator Binary operator.
 * @param {number} left Left operand.
 * @param {number} right Right operand.
 * @returns {number} Finite numeric result.
 */
function applyBinaryOperator(operator, left, right) {
  if (operator === 'divide' && right === 0) {
    throw new InvalidPredictionRuleError('division-by-zero');
  }
  const operations = /** @type {Record<string, () => number>} */ ({
    add: () => left + right,
    subtract: () => left - right,
    multiply: () => left * right,
    divide: () => left / right,
    max: () => Math.max(left, right),
    lessThan: () => (left < right ? 1 : 0),
    lessThanOrEqual: () => (left <= right ? 1 : 0),
    greaterThan: () => (left > right ? 1 : 0),
    greaterThanOrEqual: () => (left >= right ? 1 : 0),
    equal: () => (left === right ? 1 : 0),
  });
  return requireFinitePrediction(operations[operator]());
}

/**
 * Evaluate one binary operator node at one sequence prefix.
 * @param {Record<string, any>} node Rule AST node.
 * @param {string} operator Binary operator.
 * @param {RuleEvaluationState} state Sequence, time step, and per-evaluation bounds.
 * @returns {number} Finite prediction.
 */
function evaluateBinaryNode(node, operator, state) {
  requireExactFields(node, ['op', 'left', 'right']);
  const left = evaluateNode(node.left, state);
  const right = evaluateNode(node.right, state);
  return applyBinaryOperator(operator, left, right);
}

/**
 * Evaluate one unary operator node at one sequence prefix.
 * @param {Record<string, any>} node Rule AST node.
 * @param {string} operator Unary operator.
 * @param {RuleEvaluationState} state Sequence, time step, and per-evaluation bounds.
 * @returns {number} Finite prediction.
 */
function evaluateUnaryNode(node, operator, state) {
  requireExactFields(node, ['op', 'value']);
  const value = evaluateNode(node.value, state);
  return requireFinitePrediction(
    operator === 'negate' ? -value : Math.max(0, value)
  );
}

/**
 * Evaluate one inclusive-prefix reduction.
 * @param {Record<string, any>} node Rule AST node.
 * @param {string} operator Prefix reduction operator.
 * @param {RuleEvaluationState} state Sequence, time step, and per-evaluation bounds.
 * @returns {number} Finite prefix reduction.
 */
function evaluatePrefixNode(node, operator, state) {
  requireExactFields(node, ['op']);
  const prefix = state.sequence.slice(0, state.timeStep + 1);
  let result;
  if (operator === 'prefixSum' || operator === 'prefixMean') {
    const sum = prefix.reduce((total, value) => total + value, 0);
    result = operator === 'prefixMean' ? sum / prefix.length : sum;
  } else {
    result =
      operator === 'prefixMax' ? Math.max(...prefix) : Math.min(...prefix);
  }
  return requireFinitePrediction(result);
}

/**
 * Evaluate one rule node at one sequence prefix.
 * @param {unknown} value Rule syntax-tree node.
 * @param {RuleEvaluationState} state Sequence, time step, and per-evaluation bounds.
 * @returns {number} Finite prediction.
 */
function evaluateNode(value, state) {
  const node = readRuleRecord(value);
  state.nodes += 1;
  if (state.nodes > MAX_RULE_NODES) {
    throw new InvalidPredictionRuleError('rule-exceeds-node-limit');
  }
  if (state.ancestors.has(node)) {
    throw new InvalidPredictionRuleError('cyclic-rule');
  }
  state.ancestors.add(node);
  try {
    const operator = node.op;
    if (operator === 'constant') {
      requireExactFields(node, ['op', 'value']);
      if (!Number.isFinite(node.value)) {
        throw new InvalidPredictionRuleError('invalid-constant');
      }
      return node.value;
    }
    if (operator === 'time') {
      requireExactFields(node, ['op']);
      return state.timeStep;
    }
    if (operator === 'input') {
      requireExactFields(node, ['op', 'index']);
      const inputIndex = evaluateNode(node.index, state);
      if (
        !Number.isSafeInteger(inputIndex) ||
        inputIndex < 0 ||
        inputIndex > state.timeStep
      ) {
        throw new InvalidPredictionRuleError('input-index-out-of-prefix');
      }
      return state.sequence[inputIndex];
    }
    if (BINARY_OPERATORS.has(operator)) {
      return evaluateBinaryNode(node, operator, state);
    }
    if (UNARY_OPERATORS.has(operator)) {
      return evaluateUnaryNode(node, operator, state);
    }
    if (PREFIX_OPERATORS.has(operator)) {
      return evaluatePrefixNode(node, operator, state);
    }
    throw new InvalidPredictionRuleError('unsupported-rule-operator');
  } finally {
    state.ancestors.delete(node);
  }
}

/**
 * Evaluate the frozen restricted rule over all ten prefixes of one input.
 * @param {unknown} rule Restricted JSON AST.
 * @param {Array<number>} sequence Length-ten input sequence.
 * @returns {{valid: true, predictions: Array<number>}|{valid: false, errors: Array<{code: string}>}} Deterministic rule predictions or an attempted failure.
 */
export function evaluateAlgZooRestrictedRule(rule, sequence) {
  if (
    !Array.isArray(sequence) ||
    sequence.length !== SEQUENCE_LENGTH ||
    !sequence.every(Number.isFinite)
  ) {
    return { valid: false, errors: [{ code: 'invalid-input-sequence' }] };
  }
  try {
    const predictions = Array.from({ length: SEQUENCE_LENGTH }, (_, timeStep) =>
      evaluateNode(rule, {
        sequence,
        timeStep,
        nodes: 0,
        ancestors: new Set(),
      })
    );
    return { valid: true, predictions };
  } catch (error) {
    if (error instanceof InvalidPredictionRuleError) {
      return { valid: false, errors: [{ code: error.code }] };
    }
    return { valid: false, errors: [{ code: 'invalid-rule-evaluation' }] };
  }
}

/**
 * Validate and read the evaluator-only input and activation matrices.
 * @param {unknown} value Input and per-target reference activations.
 * @returns {HeldOutEvaluationData} Protocol-shaped held-out data.
 */
function validateHeldOutEvaluationData(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Held-out evaluation data does not match protocol.');
  }
  const data = /** @type {Record<string, unknown>} */ (value);
  const keys = Reflect.ownKeys(data);
  const sequences = data.sequences;
  const activationsByUnit = data.activationsByUnit;
  if (
    keys.length !== 2 ||
    keys.some(key => typeof key !== 'string') ||
    !Object.hasOwn(data, 'sequences') ||
    !Object.hasOwn(data, 'activationsByUnit') ||
    !Array.isArray(sequences) ||
    sequences.length !== HELD_OUT_SEQUENCE_COUNT ||
    !Array.isArray(activationsByUnit) ||
    activationsByUnit.length !== TARGET_COUNT
  ) {
    throw new TypeError('Held-out evaluation data does not match protocol.');
  }
  const parsedSequences = readEvaluationMatrix(sequences);
  if (!parsedSequences) {
    throw new TypeError('Held-out input sequence is invalid.');
  }
  const parsedActivationsByUnit = [];
  for (const value of activationsByUnit) {
    const matrix = readEvaluationMatrix(value);
    if (!matrix) {
      throw new TypeError('Held-out activation matrix is invalid.');
    }
    parsedActivationsByUnit.push(matrix);
  }
  return /** @type {HeldOutEvaluationData} */ ({
    sequences: parsedSequences,
    activationsByUnit: parsedActivationsByUnit,
  });
}

/**
 * Calculate deterministic prediction metrics for one blinded submission.
 * @param {Array<Array<number>>} predictions Predicted activation values by sequence and time.
 * @param {ActivationMatrix} references Actual held-out activations.
 * @returns {Record<string, any>} Reproducible metric record.
 */
function calculatePredictionMetrics(predictions, references) {
  const totalCount = HELD_OUT_SEQUENCE_COUNT * SEQUENCE_LENGTH;
  const referenceMean =
    references.reduce(
      (sum, sequence) =>
        sum + sequence.reduce((sequenceSum, value) => sequenceSum + value, 0),
      0
    ) / totalCount;
  let candidateSquaredError = 0;
  let constantMeanSquaredError = 0;
  const stepSquaredErrors = Array(SEQUENCE_LENGTH).fill(0);

  for (
    let sequenceIndex = 0;
    sequenceIndex < HELD_OUT_SEQUENCE_COUNT;
    sequenceIndex += 1
  ) {
    for (let timeStep = 0; timeStep < SEQUENCE_LENGTH; timeStep += 1) {
      const reference = references[sequenceIndex][timeStep];
      const candidateError = predictions[sequenceIndex][timeStep] - reference;
      const baselineError = referenceMean - reference;
      const candidateSquare = candidateError * candidateError;
      candidateSquaredError += candidateSquare;
      constantMeanSquaredError += baselineError * baselineError;
      stepSquaredErrors[timeStep] += candidateSquare;
    }
  }

  const candidateMse = candidateSquaredError / totalCount;
  const constantMeanMse = constantMeanSquaredError / totalCount;
  const scale = Math.max(Math.sqrt(constantMeanMse), MINIMUM_SCALE);
  const normalizedRmse = Math.sqrt(candidateMse) / scale;
  const perStepNormalizedRmse = stepSquaredErrors.map(
    squaredError => Math.sqrt(squaredError / HELD_OUT_SEQUENCE_COUNT) / scale
  );
  const constantMeanMseReduction =
    constantMeanMse === 0
      ? Number(candidateMse === 0)
      : 1 - candidateMse / constantMeanMse;
  return {
    candidateMse,
    constantMeanMse,
    normalizedRmse,
    perStepNormalizedRmse,
    constantMeanMseReduction,
    passesPredictionThresholds:
      normalizedRmse <= 0.1 &&
      perStepNormalizedRmse.every(value => value <= 0.25) &&
      candidateMse <= constantMeanMse * 0.1,
  };
}

/**
 * Score blinded local predictions without returning hypotheses or causal claims.
 * @param {Array<Record<string, any>>} submissions Blinded unit submissions.
 * @param {unknown} heldOutEvaluationData Evaluator-only sequences and activations.
 * @returns {Array<Record<string, any>>} Per-submission prediction status and metrics.
 */
export function scoreAlgZooBlindedSubmissions(
  submissions,
  heldOutEvaluationData
) {
  if (!Array.isArray(submissions)) {
    throw new TypeError('Blinded submissions must be an array.');
  }
  const { sequences, activationsByUnit } = validateHeldOutEvaluationData(
    heldOutEvaluationData
  );
  return submissions.map(submission => {
    const targetUnit = submission?.targetUnit;
    if (
      !Number.isSafeInteger(targetUnit) ||
      targetUnit < 0 ||
      targetUnit >= TARGET_COUNT
    ) {
      return {
        targetUnit,
        predictionStatus: 'invalid',
        errors: [{ code: 'invalid-target-unit' }],
      };
    }
    const predictions = [];
    for (const sequence of sequences) {
      const result = evaluateAlgZooRestrictedRule(
        submission.restrictedRule,
        sequence
      );
      if (!result.valid) {
        return {
          targetUnit,
          predictionStatus: 'invalid',
          errors: result.errors,
        };
      }
      predictions.push(result.predictions);
    }
    return {
      targetUnit,
      predictionStatus: 'scored',
      predictionMetrics: calculatePredictionMetrics(
        predictions,
        activationsByUnit[targetUnit]
      ),
    };
  });
}
