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
    if (
      key === 'loc' ||
      key === 'leadingComments' ||
      key === 'trailingComments'
    )
      continue;
    if (Array.isArray(value))
      value.forEach(child => walk(/** @type {AstNode} */ (child), visit, node));
    else if (value && typeof value === 'object' && 'type' in value)
      walk(/** @type {AstNode} */ (value), visit, node);
  }
}

/**
 * Resolve a stable display name for a function node.
 * @param {AstNode} node Function node.
 * @param {AstNode | null} parent Parent node.
 * @param {number} index Anonymous-function index.
 * @returns {string} Function name.
 */
function functionName(node, parent, index) {
  if (node.id?.name) return node.id.name;
  if (parent?.type === 'VariableDeclarator' && parent.id?.name)
    return parent.id.name;
  if (parent?.type === 'ObjectProperty' && parent.key?.name)
    return parent.key.name;
  return `anonymous@${node.loc?.start.line ?? index}`;
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
      if (node.type === 'ImportDeclaration') {
        for (const specifier of node.specifiers ?? []) {
          const local = specifier.local?.name;
          if (!local) continue;
          const imported = specifier.imported?.name ?? 'default';
          const source = node.source?.value;
          if (!source) continue;
          imports.set(local, { source, imported });
        }
      }
      if (isFunction(node)) {
        const name = functionName(node, parent, anonymousIndex++);
        const id = `${file.path}#${name}`;
        functions.set(id, {
          id,
          name,
          file: file.path,
          line: node.loc?.start.line ?? null,
          exported: false,
          node,
          parent,
          imports,
        });
      }
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
    walk(caller.node.body, node => {
      if (node.type !== 'CallExpression') return;
      const callee = node.callee;
      if (!callee) return;
      if (callee.type === 'Identifier') {
        if (!callee.name) return;
        if (params.has(callee.name)) {
          ignoredCalls.push({
            caller: caller.id,
            callee: callee.name,
            reason: 'injected-parameter',
          });
          return;
        }
        const target = resolveTarget(caller, callee.name);
        if (target && target.id !== caller.id)
          edges.push({
            source: caller.id,
            target: target.id,
            kind: 'direct-call',
          });
      } else if (
        callee.type === 'MemberExpression' &&
        callee.object &&
        /** @type {AstNode} */ (callee.object).type === 'Identifier' &&
        params.has(/** @type {AstNode} */ (callee.object).name)
      ) {
        const object = /** @type {AstNode} */ (callee.object);
        const property = /** @type {AstNode} */ (callee.property);
        ignoredCalls.push({
          caller: caller.id,
          callee: `${object.name}.${property?.name ?? '<computed>'}`,
          reason: 'injected-object-member',
        });
      }
    });
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
