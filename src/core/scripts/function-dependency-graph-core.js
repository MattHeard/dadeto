import path from 'node:path';

/** @typedef {{ type?: string, id?: AstNode, key?: AstNode, name?: string, loc?: { start: { line: number } }, params?: AstNode[], body?: AstNode, callee?: AstNode, left?: AstNode, source?: { value: string }, specifiers?: AstNode[], imported?: AstNode, local?: AstNode, declaration?: AstNode, node?: AstNode, [key: string]: unknown }} AstNode */
/** @typedef {(node: AstNode, parent: AstNode | null) => void} AstVisitor */
/** @typedef {{ source: string, imported: string }} ImportBinding */

/**
 * Check whether an AST node represents a function.
 * @param {AstNode} node AST node.
 * @returns {boolean} Whether the node is a function.
 */
function isFunction(node) {
  return [
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'ObjectMethod',
    'ClassMethod',
  ].includes(node?.type ?? '');
}

/**
 * Walk an AST subtree while skipping parser metadata fields.
 * @param {AstNode | null | undefined} node AST node.
 * @param {AstVisitor} visit Visitor callback.
 * @param {AstNode | null} [parent] Parent node.
 * @returns {void}
 */
function walk(node, visit, parent = null) {
  if (!node || typeof node !== 'object') return;
  visit(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (isMetadataKey(key)) continue;
    walkValue(value, visit, node);
  }
}

/**
 * Check whether an AST property is parser metadata.
 * @param {string} key AST property name.
 * @returns {boolean} Whether metadata should be skipped.
 */
function isMetadataKey(key) {
  return (
    key === 'loc' || key === 'leadingComments' || key === 'trailingComments'
  );
}

/**
 * Walk an AST property value when it contains child nodes.
 * @param {unknown} value Property value.
 * @param {AstVisitor} visit Visitor callback.
 * @param {AstNode} parent Parent node.
 * @returns {void}
 */
function walkValue(value, visit, parent) {
  if (Array.isArray(value)) {
    value.forEach(child => walk(/** @type {AstNode} */ (child), visit, parent));
    return;
  }
  if (value && typeof value === 'object' && 'type' in value)
    walk(/** @type {AstNode} */ (value), visit, parent);
}

/**
 * Resolve a stable display name for a function node.
 * @param {AstNode} node Function node.
 * @param {AstNode | null} parent Parent node.
 * @param {number} index Anonymous-function index.
 * @returns {string} Function name.
 */
function functionName(node, parent, index) {
  return (
    nodeFunctionName(node) ??
    parentFunctionName(parent) ??
    `anonymous@${node.loc?.start.line ?? index}`
  );
}

/**
 * Read a function declaration name.
 * @param {AstNode} node Function node.
 * @returns {string|null} Declared name or null.
 */
function nodeFunctionName(node) {
  return node.id?.name ?? null;
}

/**
 * Read a name assigned by a parent expression.
 * @param {AstNode|null} parent Parent node.
 * @returns {string|null} Assigned name or null.
 */
function parentFunctionName(parent) {
  if (isVariableParent(parent))
    return /** @type {AstNode} */ (parent).id?.name ?? null;
  if (isObjectPropertyParent(parent))
    return /** @type {AstNode} */ (parent).key?.name ?? null;
  return null;
}

/**
 * Check whether the parent declares a variable.
 * @param {AstNode|null} parent Parent node.
 * @returns {boolean} Whether it declares a variable.
 */
function isVariableParent(parent) {
  return parent?.type === 'VariableDeclarator';
}

/**
 * Check whether the parent is an object property.
 * @param {AstNode|null} parent Parent node.
 * @returns {boolean} Whether it is an object property.
 */
function isObjectPropertyParent(parent) {
  return parent?.type === 'ObjectProperty';
}

/**
 * Resolve an identifier binding name.
 * @param {AstNode} node Candidate node.
 * @returns {string|null} Binding name or null.
 */
function bindingName(node) {
  if (node?.type === 'Identifier') return node.name ?? null;
  return null;
}

/**
 * Resolve an imported binding by local name.
 * @param {Map<string, { source: string, imported: string }>} imports Import map.
 * @param {string} name Local binding name.
 * @returns {{ source: string, imported: string }|null} Import binding or null.
 */
function importTarget(imports, name) {
  const binding = imports.get(name);
  return binding ?? null;
}

/**
 * Build a conservative, function-level direct dependency graph from Babel ASTs.
 * @param {object} options Graph inputs.
 * @param {Array<{ path: string, source: string }>} options.files Source files.
 * @param {(source: string, options: object) => AstNode} options.parse AST parser.
 * @returns {{ nodes: Array<object>, edges: Array<object>, ignoredCalls: Array<object> }} Dependency graph.
 */
export function buildFunctionDependencyGraph({ files, parse }) {
  const parsed = new Map();
  const functions = new Map();
  /** @type {Map<string, Map<string, ImportBinding>>} */
  const importsByFile = new Map();
  let anonymousIndex = 0;

  for (const file of files) {
    const ast = parse(file.source, {
      sourceType: 'module',
      plugins: ['jsx', 'classProperties', 'topLevelAwait'],
    });
    parsed.set(file.path, ast);
    /** @type {Map<string, ImportBinding>} */
    const imports = new Map();
    walk(ast, (node, parent) => {
      collectImportBinding(node, imports);
      if (!isFunction(node)) return;
      anonymousIndex = registerFunction({
        node,
        parent,
        filePath: file.path,
        imports,
        functions,
        anonymousIndex,
      });
    });
    importsByFile.set(file.path, imports);
  }

  const byFileAndName = new Map(
    [...functions.values()].map(fn => [`${fn.file}#${fn.name}`, fn])
  );
  for (const fn of functions.values()) {
    const exportNames = new Set();
    walk(parsed.get(fn.file), node => {
      if (
        (node.type === 'ExportNamedDeclaration' ||
          node.type === 'ExportDefaultDeclaration') &&
        node.declaration === fn.node
      )
        exportNames.add(fn.name);
    });
    fn.exported = exportNames.size > 0;
  }

  /** @type {Array<{ source: string, target: string, kind: string }>} */
  const edges = [];
  /** @type {Array<{ caller: string, callee: string, reason: string }>} */
  const ignoredCalls = [];
  /**
   * Resolve a local or relative imported function target.
   * @param {AstNode} caller Calling function metadata.
   * @param {string} name Candidate local function name.
   * @returns {{ id: string }|null} Resolved function or null.
   */
  const resolveTarget = (caller, name) => {
    const file = String(caller.file);
    const local = byFileAndName.get(`${file}#${name}`);
    if (local) return local;
    const imported = importTarget(
      /** @type {Map<string, ImportBinding>} */ (importsByFile.get(file)),
      String(name)
    );
    if (!imported || !imported.source.startsWith('.')) return null;
    const resolved = path.normalize(
      path.join(path.dirname(file), imported.source)
    );
    const candidates = [resolved, `${resolved}.js`, `${resolved}/index.js`];
    return (
      candidates
        .map(candidate =>
          byFileAndName.get(`${candidate}#${imported.imported}`)
        )
        .find(Boolean) ?? null
    );
  };

  for (const caller of functions.values()) {
    const params = new Set(
      (caller.node.params ?? []).map(
        /**
         * @param {AstNode} param Parameter node.
         * @returns {string|null} Parameter binding name.
         */ param => bindingName(param) ?? param.left?.name ?? null
      )
    );
    walk(caller.node.body, node =>
      inspectCallNode({
        node,
        caller,
        params,
        resolveTarget,
        edges,
        ignoredCalls,
      })
    );
  }
  const uniqueEdges = [
    ...new Map(
      edges.map(edge => [`${edge.source}->${edge.target}`, edge])
    ).values(),
  ];
  return {
    nodes: [...functions.values()].map(
      ({ id, name, file, line, exported }) => ({
        id,
        name,
        file,
        line,
        exported,
      })
    ),
    edges: uniqueEdges,
    ignoredCalls,
  };
}

/**
 * Collect one import declaration into a file-local binding map.
 * @param {AstNode} node AST node.
 * @param {Map<string, ImportBinding>} imports Import map.
 * @returns {void}
 */
function collectImportBinding(node, imports) {
  if (node.type !== 'ImportDeclaration') return;
  for (const specifier of node.specifiers ?? []) {
    const binding = readImportBinding(node, specifier);
    if (binding) imports.set(binding.local, binding.value);
  }
}

/**
 * Normalize one import specifier.
 * @param {AstNode} node Import declaration.
 * @param {AstNode} specifier Import specifier.
 * @returns {{ local: string, value: ImportBinding }|null} Binding or null.
 */
function readImportBinding(node, specifier) {
  const local = specifier.local?.name;
  const source = node.source?.value;
  if (!local || !source) return null;
  return {
    local,
    value: { source, imported: specifier.imported?.name ?? 'default' },
  };
}

/**
 * Register a discovered function in the graph.
 * @param {{ node: AstNode, parent: AstNode|null, filePath: string, imports: Map<string, ImportBinding>, functions: Map<string, object>, anonymousIndex: number }} input Function registration input.
 * @returns {number} Next anonymous index.
 */
function registerFunction({
  node,
  parent,
  filePath,
  imports,
  functions,
  anonymousIndex,
}) {
  const name = functionName(node, parent, anonymousIndex);
  const id = `${filePath}#${name}`;
  functions.set(id, {
    id,
    name,
    file: filePath,
    line: node.loc?.start.line ?? null,
    exported: false,
    node,
    parent,
    imports,
  });
  return anonymousIndex + 1;
}

/**
 * Inspect one call expression and record its graph edge or injected dependency.
 * @param {{ node: AstNode, caller: object, params: Set<string>, resolveTarget: Function, edges: Array<object>, ignoredCalls: Array<object> }} input Call inspection input.
 * @returns {void}
 */
function inspectCallNode({
  node,
  caller,
  params,
  resolveTarget,
  edges,
  ignoredCalls,
}) {
  if (node.type !== 'CallExpression' || !node.callee) return;
  const callee = node.callee;
  if (callee.type === 'Identifier') {
    recordIdentifierCall({
      node,
      caller,
      params,
      resolveTarget,
      edges,
      ignoredCalls,
    });
    return;
  }
  recordInjectedMemberCall({ node, caller, params, ignoredCalls });
}

/**
 * Record an identifier call using the shared call-inspection context.
 * @param {{ node: AstNode, caller: object, params: Set<string>, resolveTarget: Function, edges: Array<object>, ignoredCalls: Array<object> }} input Call input.
 * @returns {void}
 */
function recordIdentifierCall(input) {
  const { node, caller, params, resolveTarget, edges, ignoredCalls } = input;
  const callee = /** @type {AstNode} */ (node.callee);
  const typedCaller = /** @type {{ id: string }} */ (caller);
  if (!callee.name) return;
  if (params.has(callee.name)) {
    ignoredCalls.push({
      caller: typedCaller.id,
      callee: callee.name,
      reason: 'injected-parameter',
    });
    return;
  }
  const target = resolveTarget(caller, callee.name);
  if (target && target.id !== typedCaller.id)
    edges.push({
      source: typedCaller.id,
      target: target.id,
      kind: 'direct-call',
    });
}

/** @param {{ node: AstNode, caller: object, params: Set<string>, ignoredCalls: Array<object> }} input Call input. @returns {void} */
function recordInjectedMemberCall({ node, caller, params, ignoredCalls }) {
  const callee = /** @type {AstNode} */ (node.callee);
  const typedCaller = /** @type {{ id: string }} */ (caller);
  const memberObject = /** @type {AstNode | undefined} */ (callee.object);
  const objectName = /** @type {string} */ (memberObject?.name);
  if (
    callee.type !== 'MemberExpression' ||
    !memberObject ||
    memberObject.type !== 'Identifier' ||
    !params.has(objectName)
  )
    return;
  ignoredCalls.push({
    caller: typedCaller.id,
    callee: `${objectName}.${/** @type {AstNode | undefined} */ (callee.property)?.name ?? '<computed>'}`,
    reason: 'injected-object-member',
  });
}
