/** @typedef {{label: string, kind: string, line: number, column: number, detail: string}} Signal */
/** @typedef {{signals: Signal[], seenLabels: Set<string>, seenSignals: Set<string>}} SignalState */
/** @typedef {{type: string, operator?: string}} Operand */

/**
 * Keep the first occurrence of each signal kind without losing later kinds.
 * @param {Signal | null} signal Current AST signal, if present.
 * @param {SignalState} state Per-function classification state.
 * @returns {void}
 */
export function recordClassificationSignal(signal, state) {
  if (signal === null) return;
  const key = `${signal.label}:${signal.kind}`;
  if (state.seenSignals.has(key)) return;
  state.seenSignals.add(key);
  state.seenLabels.add(signal.label);
  state.signals.push(signal);
}

/**
 * Distinguish runtime type inspection from comparisons of domain values.
 * @param {{left: Operand, right: Operand}} comparison Binary expression operands.
 * @returns {boolean} Whether either operand inspects a runtime type.
 */
export function isTypeofComparison(comparison) {
  return isTypeofOperand(comparison.left) || isTypeofOperand(comparison.right);
}

/**
 * @param {Operand} operand Typed AST operand.
 * @returns {boolean} Whether this is the typeof unary operation.
 */
function isTypeofOperand(operand) {
  return operand.type === 'UnaryExpression' && operand.operator === 'typeof';
}

/** @typedef {{type: string, callee?: {type: string, computed?: boolean, object?: {type: string, name?: string}, property?: {type: string, name?: string}}}} ValueExpression */

/**
 * Identify concrete value production without changing legacy classifier labels.
 * Boolean predicates and unknown calls are deliberately not value evidence.
 * @param {ValueExpression | null | undefined} expression Returned expression.
 * @returns {boolean} Whether it projects or constructs a non-predicate value.
 */
export function isValueExpression(expression) {
  if (!expression) return false;
  if (
    [
      'StringLiteral',
      'NumericLiteral',
      'TemplateLiteral',
      'ObjectExpression',
      'ArrayExpression',
      'MemberExpression',
      'OptionalMemberExpression',
    ].includes(expression.type)
  )
    return true;
  return (
    expression.type === 'CallExpression' &&
    isObjectEntryProjection(expression.callee)
  );
}

/**
 * Recognize an object value projection rather than a boolean validation call.
 * @param {ValueExpression['callee']} callee Called expression.
 * @returns {boolean} Whether it is the ordinary Object.fromEntries projection.
 */
function isObjectEntryProjection(callee) {
  return (
    callee?.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object?.type === 'Identifier' &&
    callee.object.name === 'Object' &&
    callee.property?.type === 'Identifier' &&
    callee.property.name === 'fromEntries'
  );
}
