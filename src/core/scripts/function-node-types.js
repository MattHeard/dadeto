const FUNCTION_NODE_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
  'ClassMethod',
  'ClassPrivateMethod',
]);

/**
 * Check whether an AST type represents a function node.
 * @param {string | undefined} type AST node type.
 * @returns {boolean} Whether the type represents a function.
 */
export function isFunctionNodeType(type) {
  return Boolean(type && FUNCTION_NODE_TYPES.has(type));
}
