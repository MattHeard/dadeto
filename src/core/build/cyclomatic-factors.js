import { PARSER_OPTIONS } from './parser-options.js';

const FUNCTION_NODES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
  'ClassMethod',
  'ClassPrivateMethod',
]);

const FACTOR_DEFINITIONS = [
  {
    match: node => node.type === 'IfStatement',
    describe: () => 'if statement',
  },
  {
    match: node => node.type === 'SwitchCase' && Boolean(node.test),
    describe: () => 'switch case',
  },
  { match: node => node.type === 'ForStatement', describe: () => 'for loop' },
  {
    match: node => node.type === 'ForInStatement',
    describe: () => 'for-in loop',
  },
  {
    match: node => node.type === 'ForOfStatement',
    describe: () => 'for-of loop',
  },
  {
    match: node => node.type === 'WhileStatement',
    describe: () => 'while loop',
  },
  {
    match: node => node.type === 'DoWhileStatement',
    describe: () => 'do-while loop',
  },
  {
    match: node => node.type === 'CatchClause',
    describe: () => 'catch clause',
  },
  {
    match: node => node.type === 'ConditionalExpression',
    describe: () => 'ternary expression',
  },
  {
    match: node =>
      node.type === 'LogicalExpression' && ['&&', '||'].includes(node.operator),
    describe: (node, snippet) =>
      `logical ${node.operator}${formatSnippetForDescription(snippet)}`,
  },
];

/**
 *
 * @param node
 */
function isFunctionNode(node) {
  return node && FUNCTION_NODES.has(node.type);
}

/**
 *
 * @param node
 */
function getIdentifierName(node) {
  if (!node) {
    return null;
  }

  if (node.type === 'Identifier') {
    return node.name;
  }

  if (node.type === 'PrivateName' && node.id?.type === 'Identifier') {
    return `#${node.id.name}`;
  }

  if (
    node.type === 'StringLiteral' ||
    node.type === 'Literal' ||
    node.type === 'NumericLiteral'
  ) {
    return String(node.value);
  }

  if (node.type === 'MemberExpression') {
    const objectName = getIdentifierName(node.object);
    const propertyName =
      node.computed && node.property
        ? `[${getIdentifierName(node.property) ?? 'expr'}]`
        : getIdentifierName(node.property);
    if (objectName && propertyName) {
      return `${objectName}.${propertyName}`;
    }
  }

  if (node.type === 'TSQualifiedName') {
    return `${getIdentifierName(node.left)}.${getIdentifierName(node.right)}`;
  }

  return null;
}

/**
 *
 * @param node
 * @param parent
 */
function getFunctionName(node, parent) {
  if (node.id && node.id.type === 'Identifier') {
    return node.id.name;
  }

  if (
    node.type === 'ObjectMethod' ||
    node.type === 'ClassMethod' ||
    node.type === 'ClassPrivateMethod'
  ) {
    return getIdentifierName(node.key) ?? '<anonymous>';
  }

  if (parent) {
    if (parent.type === 'VariableDeclarator') {
      return getIdentifierName(parent.id) ?? '<anonymous>';
    }

    if (parent.type === 'AssignmentExpression') {
      return getIdentifierName(parent.left) ?? '<anonymous>';
    }

    if (parent.type === 'Property' || parent.type === 'ObjectProperty') {
      return getIdentifierName(parent.key) ?? '<anonymous>';
    }

    if (parent.type === 'ExportDefaultDeclaration') {
      return 'default export function';
    }
  }

  return '<anonymous>';
}

/**
 *
 * @param name
 * @param loc
 */
function formatFunctionLabel(name, loc) {
  const nameSegment =
    name === '<anonymous>' ? 'Anonymous function' : `Function ${name}`;
  const lineSegment =
    loc?.start?.line != null ? `line ${loc.start.line}` : 'unknown line';
  return `${nameSegment} (${lineSegment})`;
}

/**
 *
 * @param node
 */
function getNodeLine(node) {
  return node?.loc?.start?.line ?? null;
}

/**
 *
 * @param snippet
 */
function collapseSnippet(snippet) {
  if (!snippet) {
    return null;
  }

  const normalized = snippet.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return null;
  }

  return normalized.length > 120
    ? `${normalized.slice(0, 120)}...`
    : normalized;
}

/**
 *
 * @param snippet
 */
function formatSnippetForDescription(snippet) {
  const collapsed = collapseSnippet(snippet);
  return collapsed ? ` (${collapsed})` : '';
}

/**
 *
 * @param node
 * @param parent
 * @param state
 */
function traverseNode(node, parent, state) {
  if (!node || typeof node.type !== 'string') {
    return;
  }

  const enteringFunction = isFunctionNode(node);
  if (enteringFunction) {
    const name = getFunctionName(node, parent);
    const label = formatFunctionLabel(name, node.loc);
    state.functionStack.push({ name, label, loc: node.loc });
  }

  const currentFunction = state.functionStack[state.functionStack.length - 1];
  const nodeSnippet =
    state.source &&
    typeof node.start === 'number' &&
    typeof node.end === 'number'
      ? state.source.slice(node.start, node.end)
      : null;

  if (currentFunction) {
    const factor = FACTOR_DEFINITIONS.find(definition =>
      definition.match(node)
    );

    if (factor) {
      const line = getNodeLine(node);
      state.factors.push({
        index: node.start ?? Number.MAX_SAFE_INTEGER,
        description: `${currentFunction.label}: ${factor.describe(
          node,
          nodeSnippet
        )}${line ? ` at line ${line}` : ''}`,
      });
    }
  }

  for (const key of Object.keys(node)) {
    if (['loc', 'start', 'end'].includes(key)) {
      continue;
    }
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach(item => traverseNode(item, node, state));
    } else if (child && typeof child.type === 'string') {
      traverseNode(child, node, state);
    }
  }

  if (enteringFunction) {
    state.functionStack.pop();
  }
}

/**
 *
 * @param parser
 */
function createDescribeCyclomaticFactors(parser) {
  return function describeCyclomaticFactors(code) {
    if (typeof code !== 'string') {
      throw new TypeError('code must be a string');
    }

    const ast = parser.parse(code, PARSER_OPTIONS);
    const state = {
      functionStack: [],
      factors: [],
      source: code,
    };

    traverseNode(ast, null, state);

    return state.factors
      .sort((a, b) => a.index - b.index)
      .map(entry => entry.description);
  };
}

/**
 *
 * @param root0
 * @param root0.describeCyclomaticFactors
 * @param root0.readInput
 * @param root0.stdout
 */
function createRunFromCli({ describeCyclomaticFactors, readInput, stdout }) {
  return async function runFromCli() {
    const source = await readInput();
    const output = describeCyclomaticFactors(source);
    stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  };
}

/**
 * Build the cyclomatic factor adapter handle.
 * @param {{
 *   parser: { parse: Function },
 *   readInput: () => Promise<string>,
 *   stdout: { write: (output: string) => void },
 * }} deps Runtime dependencies.
 * @returns {{
 *   describeCyclomaticFactors: (code: string) => string[],
 *   runFromCli: () => Promise<void>,
 * }} Cyclomatic factor handle.
 */
export function createCyclomaticFactorsHandle(deps) {
  const describeCyclomaticFactors = createDescribeCyclomaticFactors(
    deps.parser
  );
  return {
    describeCyclomaticFactors,
    runFromCli: createRunFromCli({
      describeCyclomaticFactors,
      readInput: deps.readInput,
      stdout: deps.stdout,
    }),
  };
}
