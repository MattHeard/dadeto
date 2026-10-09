const DEFAULT_MAXIMUM_ARITY = 4;

/**
 * Count identifier bindings in an object pattern, including nested patterns.
 * @param {import('estree').Pattern} pattern Parameter or destructuring pattern.
 * @returns {number} Number of bound leaf values.
 */
function boundLeafCount(pattern) {
  if (pattern.type === 'Identifier') {
    return 1;
  }

  if (pattern.type === 'RestElement') {
    return boundLeafCount(pattern.argument);
  }

  if (pattern.type === 'AssignmentPattern') {
    return boundLeafCount(pattern.left);
  }

  if (pattern.type === 'ArrayPattern') {
    return pattern.elements.reduce(
      (total, element) => total + (element ? boundLeafCount(element) : 0),
      0
    );
  }

  if (pattern.type === 'ObjectPattern') {
    return pattern.properties.reduce((total, property) => {
      const binding =
        property.type === 'RestElement' ? property.argument : property.value;
      return total + boundLeafCount(binding);
    }, 0);
  }

  return 0;
}

/**
 * Check whether a bag parameter is consumed outside destructuring/property reads.
 * @param {import('eslint').Rule.RuleContext} context ESLint rule context.
 * @param {import('estree').Function} functionNode Function being inspected.
 * @param {string} name Parameter identifier name.
 * @param {Set<import('estree').Node>} destructuringInitializers Bag destructuring initializer nodes.
 * @returns {boolean} True when the bag is used as a whole value.
 */
function isUsedAsWholeValue(
  context,
  functionNode,
  name,
  destructuringInitializers
) {
  const variable = /** @type {import('eslint').Scope.Variable} */ (
    context.sourceCode.getScope(functionNode).set.get(name)
  );
  return variable.references.some(reference => {
    const identifier =
      /** @type {import('estree').Identifier & { parent?: import('estree').Node }} */ (
        reference.identifier
      );
    if (!reference.isRead() || destructuringInitializers.has(identifier)) {
      return false;
    }

    const parent = identifier.parent;
    return !(
      parent?.type === 'MemberExpression' && parent.object === identifier
    );
  });
}

/**
 * Collect destructuring leaves from direct function-body variable declarations.
 * @param {import('estree').Function} functionNode Function being inspected.
 * @param {string} parameterName Bag parameter name.
 * @returns {{ count: number, initializers: Set<import('estree').Node> }} Bag bindings and initializer nodes.
 */
function getTopLevelDestructuring(functionNode, parameterName) {
  if (functionNode.body.type !== 'BlockStatement') {
    return { count: 0, initializers: new Set() };
  }

  let count = 0;
  const initializers = new Set();
  for (const statement of functionNode.body.body) {
    if (statement.type !== 'VariableDeclaration') {
      continue;
    }

    for (const declarator of statement.declarations) {
      if (
        declarator.init?.type === 'Identifier' &&
        declarator.init.name === parameterName &&
        declarator.id.type === 'ObjectPattern'
      ) {
        count += boundLeafCount(declarator.id);
        initializers.add(declarator.init);
      }
    }
  }

  return { count, initializers };
}

/**
 * Create the parameter-bag arity rule.
 * @returns {import('eslint').Rule.RuleModule} ESLint rule module.
 */
export default function createNoParameterBagAritySmugglingRule() {
  return {
    meta: {
      schema: [{ type: 'integer', minimum: 1 }],
      docs: {
        description:
          'report transport-only parameter bags that exceed the effective parameter limit',
      },
      type: 'suggestion',
      messages: {
        excessiveEffectiveArity:
          'Function has syntactic arity {{syntacticArity}} and effective arity {{effectiveArity}} (maximum {{maximumArity}}). Decompose the function instead of packing parameters into an object.',
      },
    },
    create(context) {
      const maximumArity = context.options[0] ?? DEFAULT_MAXIMUM_ARITY;

      /**
       * Check one function's syntactic and expanded arity.
       * @param {import('estree').Function} functionNode Function to check.
       * @returns {void}
       */
      function analyzeFunction(functionNode) {
        const syntacticArity = functionNode.params.length;
        let effectiveArity = syntacticArity;

        for (const parameter of functionNode.params) {
          if (parameter.type === 'ObjectPattern') {
            effectiveArity += boundLeafCount(parameter) - 1;
            continue;
          }

          if (parameter.type !== 'Identifier') {
            continue;
          }

          const { count, initializers } = getTopLevelDestructuring(
            functionNode,
            parameter.name
          );
          if (
            count > 1 &&
            !isUsedAsWholeValue(
              context,
              functionNode,
              parameter.name,
              initializers
            )
          ) {
            effectiveArity += count - 1;
          }
        }

        if (effectiveArity > maximumArity) {
          context.report({
            node: functionNode,
            messageId: 'excessiveEffectiveArity',
            data: { syntacticArity, effectiveArity, maximumArity },
          });
        }
      }

      return {
        FunctionDeclaration: analyzeFunction,
        FunctionExpression: analyzeFunction,
        ArrowFunctionExpression: analyzeFunction,
      };
    },
  };
}

export const parameterBagRuleTestUtils = {
  boundLeafCount,
  getTopLevelDestructuring,
};
