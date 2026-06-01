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

const IDENTIFIER_NAME_READERS = {
  Identifier: node => node.name,
  StringLiteral: node => String(node.value),
  Literal: node => String(node.value),
  NumericLiteral: node => String(node.value),
  MemberExpression: node => getMemberExpressionName(node),
  TSQualifiedName: node =>
    `${getIdentifierName(node.left)}.${getIdentifierName(node.right)}`,
};

/**
 * Test whether a node starts a function scope.
 * @param {{ type?: string } | null | undefined} node AST node.
 * @returns {boolean} True when the node is a function node.
 */
function isFunctionNode(node) {
  return node && FUNCTION_NODES.has(node.type);
}

/**
 * Read the key represented by a member expression.
 * @param {object} node Member expression node.
 * @returns {string | null} Member name, or null when incomplete.
 */
function getMemberExpressionName(node) {
  const objectName = getIdentifierName(node.object);
  let propertyName = getIdentifierName(node.property);
  if (node.computed && node.property) {
    propertyName = `[${propertyName ?? 'expr'}]`;
  }

  if (objectName && propertyName) {
    return `${objectName}.${propertyName}`;
  }

  return null;
}

/**
 * Read the display name represented by an AST identifier-like node.
 * @param {object | null | undefined} node AST node.
 * @returns {string | null} Display name, or null when unknown.
 */
function getIdentifierName(node) {
  if (!node) {
    return null;
  }

  if (node.type === 'PrivateName' && node.id?.type === 'Identifier') {
    return `#${node.id.name}`;
  }

  const readName = IDENTIFIER_NAME_READERS[node.type];
  if (readName) {
    return readName(node);
  }

  return null;
}

/**
 * Return a fallback anonymous marker when a name cannot be inferred.
 * @param {string | null} name Candidate name.
 * @returns {string} Candidate name or anonymous marker.
 */
function fallbackFunctionName(name) {
  return name ?? '<anonymous>';
}

/**
 * Infer a function name from the parent AST relationship.
 * @param {object | null | undefined} parent Parent AST node.
 * @returns {string | null} Inferred parent-based name.
 */
function getFunctionNameFromParent(parent) {
  if (!parent) {
    return null;
  }

  if (parent.type === 'VariableDeclarator') {
    return getIdentifierName(parent.id);
  }

  if (parent.type === 'AssignmentExpression') {
    return getIdentifierName(parent.left);
  }

  if (parent.type === 'Property' || parent.type === 'ObjectProperty') {
    return getIdentifierName(parent.key);
  }

  if (parent.type === 'ExportDefaultDeclaration') {
    return 'default export function';
  }

  return null;
}

/**
 * Infer a function display name from the node and its parent.
 * @param {object} node Function AST node.
 * @param {object | null | undefined} parent Parent AST node.
 * @returns {string} Function display name.
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
    return fallbackFunctionName(getIdentifierName(node.key));
  }

  return fallbackFunctionName(getFunctionNameFromParent(parent));
}

/**
 * Format a function label for output.
 * @param {string} name Function name.
 * @param {{ start?: { line?: number } } | null | undefined} loc Source location.
 * @returns {string} Human-readable function label.
 */
function formatFunctionLabel(name, loc) {
  let nameSegment = `Function ${name}`;
  if (name === '<anonymous>') {
    nameSegment = 'Anonymous function';
  }

  let lineSegment = 'unknown line';
  if (loc?.start?.line !== null && loc?.start?.line !== undefined) {
    lineSegment = `line ${loc.start.line}`;
  }

  return `${nameSegment} (${lineSegment})`;
}

/**
 * Read a node start line.
 * @param {object | null | undefined} node AST node.
 * @returns {number | null} Source line, or null when unavailable.
 */
function getNodeLine(node) {
  return node?.loc?.start?.line ?? null;
}

/**
 * Collapse a source snippet for inclusion in output.
 * @param {string | null | undefined} snippet Source snippet.
 * @returns {string | null} Collapsed snippet, or null when empty.
 */
function collapseSnippet(snippet) {
  if (!snippet) {
    return null;
  }

  const normalized = snippet.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length > 120) {
    return `${normalized.slice(0, 120)}...`;
  }

  return normalized;
}

/**
 * Format a collapsed snippet as a parenthetical suffix.
 * @param {string | null | undefined} snippet Source snippet.
 * @returns {string} Snippet suffix.
 */
function formatSnippetForDescription(snippet) {
  const collapsed = collapseSnippet(snippet);
  if (collapsed) {
    return ` (${collapsed})`;
  }

  return '';
}

/**
 * Read the slice of source text represented by a node.
 * @param {object} node AST node.
 * @param {string} source Source text.
 * @returns {string | null} Node source snippet, or null when unavailable.
 */
function getNodeSnippet(node, source) {
  if (
    source &&
    typeof node.start === 'number' &&
    typeof node.end === 'number'
  ) {
    return source.slice(node.start, node.end);
  }

  return null;
}

/**
 * Record a matching cyclomatic factor for the current function.
 * @param {object} node AST node.
 * @param {{ label: string }} currentFunction Current function frame.
 * @param {{ factors: object[], source: string }} state Traversal state.
 * @returns {void}
 */
function recordCyclomaticFactor(node, currentFunction, state) {
  const factor = FACTOR_DEFINITIONS.find(definition => definition.match(node));
  if (!factor) {
    return;
  }

  const line = getNodeLine(node);
  const nodeSnippet = getNodeSnippet(node, state.source);
  let lineSegment = '';
  if (line) {
    lineSegment = ` at line ${line}`;
  }
  state.factors.push({
    index: node.start ?? Number.MAX_SAFE_INTEGER,
    description: `${currentFunction.label}: ${factor.describe(
      node,
      nodeSnippet
    )}${lineSegment}`,
  });
}

/**
 * Traverse a child value from an AST node.
 * @param {*} child Child value.
 * @param {object} node Parent AST node.
 * @param {object} state Traversal state.
 * @returns {void}
 */
function traverseChild(child, node, state) {
  if (Array.isArray(child)) {
    child.forEach(item => traverseNode(item, node, state));
    return;
  }

  if (child && typeof child.type === 'string') {
    traverseNode(child, node, state);
  }
}

/**
 * Walk the AST and collect factors under each function.
 * @param {object | null | undefined} node AST node.
 * @param {object | null | undefined} parent Parent AST node.
 * @param {{ functionStack: object[], factors: object[], source: string }} state Traversal state.
 * @returns {void}
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

  if (currentFunction) {
    recordCyclomaticFactor(node, currentFunction, state);
  }

  for (const key of Object.keys(node)) {
    if (['loc', 'start', 'end'].includes(key)) {
      continue;
    }
    const child = node[key];
    traverseChild(child, node, state);
  }

  if (enteringFunction) {
    state.functionStack.pop();
  }
}

/**
 * Create the cyclomatic factor analyzer.
 * @param {{ parse: Function }} parser Parser dependency.
 * @returns {(code: string) => string[]} Analyzer function.
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
 * Create the CLI runner.
 * @param {object} root0 Runtime dependencies.
 * @param {(code: string) => string[]} root0.describeCyclomaticFactors Analyzer function.
 * @param {() => Promise<string>} root0.readInput Source reader.
 * @param {{ write: (output: string) => void }} root0.stdout Output stream.
 * @returns {() => Promise<void>} CLI runner.
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
