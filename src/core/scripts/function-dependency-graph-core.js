/* eslint-disable complexity, jsdoc/require-param-description, jsdoc/require-returns, no-ternary */
import path from 'node:path';

/** @typedef {Record<string, any>} AstNode */
/** @typedef {(node: AstNode, parent: AstNode | null) => void} AstVisitor */

/**
 *
 * @param {AstNode} node
 */
function isFunction(node) {
  return [
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'ObjectMethod',
    'ClassMethod',
  ].includes(node?.type);
}

/**
 *
 * @param {AstNode | null | undefined} node
 * @param {AstVisitor} visit
 * @param {AstNode | null} [parent]
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
    if (Array.isArray(value)) value.forEach(child => walk(child, visit, node));
    else if (value && typeof value === 'object' && value.type)
      walk(value, visit, node);
  }
}

/**
 *
 * @param {AstNode} node
 * @param {AstNode | null} parent
 * @param {number} index
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
 *
 * @param {AstNode} node
 */
function bindingName(node) {
  return node?.type === 'Identifier' ? node.name : null;
}

/**
 *
 * @param {Map<string, { source: string, imported: string }>} imports
 * @param {string} name
 */
function importTarget(imports, name) {
  const binding = imports.get(name);
  return binding ?? null;
}

/**
 * Build a conservative, function-level direct dependency graph from Babel ASTs.
 * @param {object} options Graph inputs.
 * @param {Array<{ path: string, source: string }>} options.files
 * @param {(source: string, options: object) => AstNode} options.parse
 */
export function buildFunctionDependencyGraph({ files, parse }) {
  const parsed = new Map();
  const functions = new Map();
  const importsByFile = new Map();
  let anonymousIndex = 0;

  for (const file of files) {
    const ast = parse(file.source, {
      sourceType: 'module',
      plugins: ['jsx', 'classProperties', 'topLevelAwait'],
    });
    parsed.set(file.path, ast);
    const imports = new Map();
    walk(ast, (node, parent) => {
      if (node.type === 'ImportDeclaration') {
        for (const specifier of node.specifiers) {
          const local = specifier.local.name;
          const imported = specifier.imported?.name ?? 'default';
          imports.set(local, { source: node.source.value, imported });
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
   * @param {AstNode} caller
   * @param {string} name
   */
  const resolveTarget = (caller, name) => {
    const local = byFileAndName.get(`${caller.file}#${name}`);
    if (local) return local;
    const imported = importTarget(importsByFile.get(caller.file), name);
    if (!imported || !imported.source.startsWith('.')) return null;
    const resolved = path.normalize(
      path.join(path.dirname(caller.file), imported.source)
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
        /** @param {AstNode} param */ param =>
          bindingName(param) ?? param.left?.name
      )
    );
    walk(caller.node.body, node => {
      if (node.type !== 'CallExpression') return;
      const callee = node.callee;
      if (callee.type === 'Identifier') {
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
        callee.object.type === 'Identifier' &&
        params.has(callee.object.name)
      ) {
        ignoredCalls.push({
          caller: caller.id,
          callee: `${callee.object.name}.${callee.property.name ?? '<computed>'}`,
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
