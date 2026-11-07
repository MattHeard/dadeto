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
