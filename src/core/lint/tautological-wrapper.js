const EXEMPTION_MARKER = 'tautological-wrapper: allow';

/**
 * @typedef {import('estree').FunctionDeclaration & { parent?: import('estree').Node | null, loc?: import('estree').SourceLocation | null }} WrapperFunctionDeclaration
 * @typedef {import('estree').FunctionExpression & { parent?: import('estree').Node | null, loc?: import('estree').SourceLocation | null }} WrapperFunctionExpression
 * @typedef {import('estree').ArrowFunctionExpression & { parent?: import('estree').Node | null, loc?: import('estree').SourceLocation | null }} WrapperArrowFunctionExpression
 * @typedef {WrapperFunctionDeclaration | WrapperFunctionExpression | WrapperArrowFunctionExpression} WrapperFunctionNode
 * @typedef {import('estree').Expression | import('estree').Super} WrapperCallee
 * @typedef {Array<import('estree').Expression | import('estree').SpreadElement>} WrapperCallArguments
 * @typedef {Array<import('estree').Identifier | import('estree').AssignmentPattern | import('estree').RestElement | import('estree').ObjectPattern | import('estree').ArrayPattern>} WrapperFunctionParameters
 */

/**
 * Flag functions that only forward their inputs unchanged to another function.
 * @type {import('eslint').Rule.RuleModule}
 */
const tautologicalWrapperRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow wrapper functions that only forward their inputs unchanged.',
    },
    schema: [],
    messages: {
      tautologicalWrapper:
        'This function only forwards its inputs unchanged. Inline it, add real logic, or document an exemption if it is a public API boundary.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const importNames = new Set();

    return {
      /**
       * Record imported bindings so wrapper detection can tell imported callee names from locals.
       * @param {import('estree').ImportDeclaration} node Import declaration.
       * @returns {void}
       */
      ImportDeclaration(node) {
        node.specifiers.forEach(specifier => {
          importNames.add(specifier.local.name);
        });
      },

      /**
       * Report tautological wrappers inside the configured files.
       * @param {WrapperFunctionNode} node Function-like node.
       * @returns {void}
       */
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node) {
        if (isTautologicalWrapper(node, sourceCode, importNames)) {
          context.report({ node, messageId: 'tautologicalWrapper' });
        }
      },
    };
  },
};

/**
 * Determine whether a function is a tautological wrapper.
 * @param {WrapperFunctionNode} node Function under inspection.
 * @param {import('eslint').SourceCode} sourceCode ESLint source code helper.
 * @param {Set<string>} importNames Imported binding names.
 * @returns {boolean} True when the function only forwards unchanged inputs.
 */
function isTautologicalWrapper(node, sourceCode, importNames) {
  if (shouldSkipWrapperCheck(node, sourceCode)) {
    return false;
  }

  const returnExpression = getReturnedExpression(node);
  if (!returnExpression || returnExpression.type !== 'CallExpression') {
    return false;
  }

  if (!isImportedCallee(returnExpression.callee, importNames)) {
    return false;
  }

  if (functionNameMatchesCallee(node, returnExpression.callee)) {
    return false;
  }

  return doArgumentsMatchParameters(
    /** @type {WrapperFunctionParameters} */ (node.params),
    /** @type {WrapperCallArguments} */ (returnExpression.arguments)
  );
}

/**
 * Determine whether the wrapper check should skip this function.
 * @param {WrapperFunctionNode} node Function under inspection.
 * @param {import('eslint').SourceCode} sourceCode ESLint source code helper.
 * @returns {boolean} True when the function should be ignored.
 */
function shouldSkipWrapperCheck(node, sourceCode) {
  return (
    node.async ||
    node.generator ||
    isExportedFunction(node) ||
    hasDocumentedExemption(node, sourceCode)
  );
}

/**
 * Read the single returned expression from a function body.
 * @param {WrapperFunctionNode} node Function under inspection.
 * @returns {import('estree').Expression | null} Returned expression, if the body is a simple pass-through.
 */
function getReturnedExpression(node) {
  if (node.type === 'ArrowFunctionExpression') {
    if (node.body.type === 'BlockStatement') {
      return getSingleReturnExpression(node.body.body);
    }

    return node.body;
  }

  if (node.body.type !== 'BlockStatement') {
    return null;
  }

  return getSingleReturnExpression(node.body.body);
}

/**
 * Extract the return value from a one-statement block.
 * @param {import('estree').Statement[]} statements Function body statements.
 * @returns {import('estree').Expression | null} Return expression when the body is a single return.
 */
function getSingleReturnExpression(statements) {
  if (statements.length !== 1) {
    return null;
  }

  const [statement] = statements;
  if (statement.type !== 'ReturnStatement' || !statement.argument) {
    return null;
  }

  return statement.argument;
}

/**
 * Determine whether a callee comes from an imported binding.
 * @param {WrapperCallee} callee Call target.
 * @param {Set<string>} importNames Imported binding names.
 * @returns {boolean} True when the callee is an imported symbol or method.
 */
function isImportedCallee(callee, importNames) {
  if (callee.type === 'Identifier') {
    return importNames.has(callee.name);
  }

  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier'
  ) {
    return importNames.has(callee.object.name);
  }

  return false;
}

/**
 * Determine whether the forwarded arguments match the function parameters.
 * @param {WrapperFunctionParameters} params Function parameters.
 * @param {WrapperCallArguments} args Forwarded call arguments.
 * @returns {boolean} True when the arguments are forwarded unchanged.
 */
function doArgumentsMatchParameters(params, args) {
  if (params.length !== args.length) {
    return false;
  }

  for (let index = 0; index < params.length; index += 1) {
    if (!isForwardedParameter(params[index], args[index])) {
      return false;
    }
  }

  return true;
}

/**
 * Check whether a parameter is forwarded unchanged to the matching argument.
 * @param {WrapperFunctionParameters[number]} param Function parameter.
 * @param {WrapperCallArguments[number]} arg Forwarded argument.
 * @returns {boolean} True when the parameter is forwarded unchanged.
 */
function isForwardedParameter(param, arg) {
  return (
    isForwardedIdentifierParameter(param, arg) ||
    isForwardedRestParameter(param, arg)
  );
}

/**
 * Check whether a plain identifier parameter is forwarded unchanged.
 * @param {WrapperFunctionParameters[number]} param Function parameter.
 * @param {WrapperCallArguments[number]} arg Forwarded argument.
 * @returns {boolean} True when the identifier parameter is forwarded unchanged.
 */
function isForwardedIdentifierParameter(param, arg) {
  return (
    param.type === 'Identifier' &&
    arg.type === 'Identifier' &&
    arg.name === param.name
  );
}

/**
 * Check whether a rest parameter is forwarded unchanged.
 * @param {WrapperFunctionParameters[number]} param Function parameter.
 * @param {WrapperCallArguments[number]} arg Forwarded argument.
 * @returns {boolean} True when the rest parameter is forwarded unchanged.
 */
function isForwardedRestParameter(param, arg) {
  return (
    param.type === 'RestElement' &&
    param.argument.type === 'Identifier' &&
    arg.type === 'SpreadElement' &&
    arg.argument.type === 'Identifier' &&
    arg.argument.name === param.argument.name
  );
}

/**
 * Get the name that identifies the wrapper function itself.
 * @param {WrapperFunctionNode} node Function under inspection.
 * @returns {string | null} Function name when available.
 */
function getFunctionName(node) {
  const directName = getDeclaredFunctionName(node);
  if (directName) {
    return directName;
  }

  const assignedName = getAssignedFunctionName(node);
  if (assignedName) {
    return assignedName;
  }

  return getPropertyFunctionName(node);
}

/**
 * Read the declared name from a function declaration or named function expression.
 * @param {WrapperFunctionNode} node Function under inspection.
 * @returns {string | null} Function name when declared directly.
 */
function getDeclaredFunctionName(node) {
  if (
    (node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression') &&
    node.id
  ) {
    return node.id.name;
  }

  return null;
}

/**
 * Read the assigned name from a variable or assignment wrapper.
 * @param {WrapperFunctionNode} node Function under inspection.
 * @returns {string | null} Function name when assigned to a variable.
 */
function getAssignedFunctionName(node) {
  const parent = node.parent;

  if (
    parent?.type === 'VariableDeclarator' &&
    parent.id.type === 'Identifier'
  ) {
    return parent.id.name;
  }

  if (
    parent?.type === 'AssignmentExpression' &&
    parent.left.type === 'Identifier'
  ) {
    return parent.left.name;
  }

  return null;
}

/**
 * Read the name from an object property wrapper.
 * @param {WrapperFunctionNode} node Function under inspection.
 * @returns {string | null} Function name when assigned as a property value.
 */
function getPropertyFunctionName(node) {
  const parent = node.parent;

  if (parent?.type !== 'Property' || parent.computed) {
    return null;
  }

  return getPropertyKeyName(parent.key);
}

/**
 * Read the name from a property key node.
 * @param {import('estree').Expression | import('estree').PrivateIdentifier} key Property key.
 * @returns {string | null} Property name when available.
 */
function getPropertyKeyName(key) {
  if (key.type === 'Identifier') {
    return key.name;
  }

  if (key.type === 'Literal' && typeof key.value === 'string') {
    return key.value;
  }

  return null;
}

/**
 * Get a display name for the callee.
 * @param {WrapperCallee} callee Call target.
 * @returns {string | null} Callee name when available.
 */
function getCalleeName(callee) {
  if (callee.type === 'Identifier') {
    return callee.name;
  }

  if (callee.type === 'MemberExpression' && !callee.computed) {
    if (callee.property.type === 'Identifier') {
      return callee.property.name;
    }

    if (
      callee.property.type === 'Literal' &&
      typeof callee.property.value === 'string'
    ) {
      return callee.property.value;
    }
  }

  return null;
}

/**
 * Check whether the wrapper function and callee share the same visible name.
 * @param {WrapperFunctionNode} node Function under inspection.
 * @param {WrapperCallee} callee Call target.
 * @returns {boolean} True when the function and callee are named the same.
 */
function functionNameMatchesCallee(node, callee) {
  return getFunctionName(node) === getCalleeName(callee);
}

/**
 * Check for an explicit documented exemption directly above the function.
 * @param {WrapperFunctionNode} node Function under inspection.
 * @param {import('eslint').SourceCode} sourceCode ESLint source code helper.
 * @returns {boolean} True when the function has a documented exemption comment.
 */
function hasDocumentedExemption(node, sourceCode) {
  const comments = sourceCode.getCommentsBefore(node);
  const comment = comments[comments.length - 1];

  if (!comment) {
    return false;
  }

  const commentLoc = comment.loc;
  const nodeLoc = node.loc;
  if (!commentLoc || !nodeLoc) {
    return false;
  }

  const isAdjacent = commentLoc.end.line >= nodeLoc.start.line - 1;
  const isExemptMarker = comment.value.includes(EXEMPTION_MARKER);
  return isAdjacent && isExemptMarker;
}

/**
 * Determine whether the function is exported from the current module.
 * @param {WrapperFunctionNode} node Function under inspection.
 * @returns {boolean} True when the function is part of the public module API.
 */
function isExportedFunction(node) {
  let current = /** @type {import('estree').Node | null | undefined} */ (
    node.parent
  );

  while (current) {
    if (
      current.type === 'ExportNamedDeclaration' ||
      current.type === 'ExportDefaultDeclaration'
    ) {
      return true;
    }

    current = /** @type {any} */ (current).parent;
  }

  return false;
}

export const tautologicalWrapperTestOnly = {
  doArgumentsMatchParameters,
  functionNameMatchesCallee,
  getAssignedFunctionName,
  getCalleeName,
  getDeclaredFunctionName,
  getFunctionName,
  getPropertyFunctionName,
  getPropertyKeyName,
  getReturnedExpression,
  getSingleReturnExpression,
  hasDocumentedExemption,
  isExportedFunction,
  isForwardedIdentifierParameter,
  isForwardedParameter,
  isForwardedRestParameter,
  isImportedCallee,
  isTautologicalWrapper,
  shouldSkipWrapperCheck,
};

export default tautologicalWrapperRule;
