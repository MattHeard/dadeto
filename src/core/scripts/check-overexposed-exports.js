import { readExemptions } from './read-exemptions.js';

const DEFAULT_ROOT_DIR = '.';
const DEFAULT_SOURCE_ROOT = 'src';
const DEFAULT_CONFIG_PATH = 'overexposed-exports-exemptions.json';
const DEFAULT_PARSE =
  /** @type {(source: string, options: { ecmaVersion: string, sourceType: string, loc: boolean, range: boolean }) => import('estree').Program} */ (
    () => ({ type: 'Program', body: [], sourceType: 'module' })
  );
const DEFAULT_STDOUT = { write() {} };
const DEFAULT_STDERR = { write() {} };

/**
 * @typedef {{
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>,
 *   rootDir: string,
 *   sourceRoot: string,
 *   configPath: string,
 *   parse?: (source: string, options: { ecmaVersion: string, sourceType: string, loc: boolean, range: boolean }) => import('estree').Program,
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 * }} OverexposedExportsDeps
 */

/**
 * @typedef {{
 *   filePath: string,
 *   exports: Array<{ exportName: string, line: number, column: number }>,
 *   ownCalls: Map<string, number>,
 *   importedCalls: Array<{ source: string, exportName: string }>,
 * }} FileAnalysis
 */

/**
 * Create a command handler that reports exported functions only used in their defining file.
 * @param {{
 *   readFileSync?: (filePath: string, encoding: 'utf8') => string,
 *   readdirSync?: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   rootDir?: string,
 *   sourceRoot?: string,
 *   configPath?: string,
 *   parse?: (source: string, options: { ecmaVersion: string, sourceType: string, loc: boolean, range: boolean }) => import('estree').Program,
 *   pathModule?: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 * }} [options] Gate dependencies.
 * @returns {() => { exitCode: number, violations: number }} Gate handler.
 */
export function createCheckOverexposedExportsHandle(options = {}) {
  const deps = normalizeOptions(options);

  return function handleOverexposedExports() {
    const exemptions = readExemptions(deps);
    const violations = findOverexposedExportViolations(deps).filter(
      violation => !exemptions.has(violation.filePath)
    );

    if (violations.length === 0) {
      deps.stdout.write(
        'Checked export locality: no over-exposed exports found.\n'
      );
      return { exitCode: 0, violations: 0 };
    }

    for (const violation of violations) {
      deps.stderr.write(
        `${violation.filePath}:${violation.line}:${violation.column} - ${violation.exportName} is exported but only used in its own file\n`
      );
    }

    let suffix = '';
    if (violations.length !== 1) {
      suffix = 's';
    }
    deps.stderr.write(
      `Found ${violations.length} over-exposed export${suffix}.\n`
    );

    return { exitCode: 1, violations: violations.length };
  };
}

/**
 * Find exported functions that are only used in their own non-test file.
 * @param {OverexposedExportsDeps} deps Filesystem dependencies.
 * @returns {Array<{ filePath: string, line: number, column: number, exportName: string, ownCalls: number }>} Violations.
 */
export function findOverexposedExportViolations(deps) {
  const files = listJavaScriptFiles(deps, deps.sourceRoot);
  const analyses = files.map(filePath => analyzeSourceFile(deps, filePath));
  const moduleIndex = new Set(analyses.map(file => file.filePath));
  const externalUsageCounts = buildExternalUsageCounts(
    deps,
    analyses,
    moduleIndex
  );
  return collectViolations(deps, analyses, externalUsageCounts);
}

/**
 * Normalize the gate dependencies with defaults.
 * @param {{
 *   readFileSync?: (filePath: string, encoding: 'utf8') => string,
 *   readdirSync?: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   rootDir?: string,
 *   sourceRoot?: string,
 *   configPath?: string,
 *   parse?: (source: string, options: { ecmaVersion: string, sourceType: string, loc: boolean, range: boolean }) => import('estree').Program,
 *   pathModule?: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 * }} options Optional dependencies.
 * @returns {OverexposedExportsDeps & { stdout: { write: (text: string) => void }, stderr: { write: (text: string) => void } }} Normalized deps.
 */
/* eslint-disable complexity */
/**
 * @param {{
 *   readFileSync?: (filePath: string, encoding: 'utf8') => string,
 *   readdirSync?: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   rootDir?: string,
 *   sourceRoot?: string,
 *   configPath?: string,
 *   parse?: (source: string, options: { ecmaVersion: string, sourceType: string, loc: boolean, range: boolean }) => import('estree').Program,
 *   pathModule?: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 * }} options Optional dependencies.
 * @returns {OverexposedExportsDeps & { stdout: { write: (text: string) => void }, stderr: { write: (text: string) => void } }} Normalized deps.
 */
function normalizeOptions(options) {
  return {
    readFileSync: options.readFileSync ?? (() => ''),
    readdirSync: options.readdirSync ?? (() => []),
    stdout: options.stdout ?? DEFAULT_STDOUT,
    stderr: options.stderr ?? DEFAULT_STDERR,
    rootDir: options.rootDir ?? DEFAULT_ROOT_DIR,
    sourceRoot: options.sourceRoot ?? DEFAULT_SOURCE_ROOT,
    configPath: options.configPath ?? DEFAULT_CONFIG_PATH,
    parse: options.parse ?? DEFAULT_PARSE,
    pathModule: options.pathModule ?? createDefaultPathModule(),
  };
}
/* eslint-enable complexity */

/**
 * @param {OverexposedExportsDeps} deps Filesystem dependencies.
 * @param {FileAnalysis[]} analyses File analyses.
 * @param {Set<string>} moduleIndex Known module file paths.
 * @returns {Map<string, number>} External usage counts.
 */
function buildExternalUsageCounts(deps, analyses, moduleIndex) {
  /** @type {Map<string, number>} */
  const externalUsageCounts = new Map();
  for (const file of analyses) {
    for (const importedCall of file.importedCalls) {
      const resolvedFilePath = resolveImportSource(
        deps,
        file.filePath,
        importedCall.source,
        moduleIndex
      );
      if (!resolvedFilePath) {
        continue;
      }
      const usageKey = makeUsageKey(resolvedFilePath, importedCall.exportName);
      externalUsageCounts.set(
        usageKey,
        (externalUsageCounts.get(usageKey) ?? 0) + 1
      );
    }
  }
  return externalUsageCounts;
}

/**
 * @param {OverexposedExportsDeps} deps Filesystem dependencies.
 * @param {FileAnalysis[]} analyses File analyses.
 * @param {Map<string, number>} externalUsageCounts External usage counts.
 * @returns {Array<{ filePath: string, line: number, column: number, exportName: string, ownCalls: number }>} Violations.
 */
function collectViolations(deps, analyses, externalUsageCounts) {
  /** @type {Array<{ filePath: string, line: number, column: number, exportName: string, ownCalls: number }>} */
  const violations = [];
  for (const file of analyses) {
    for (const exportedFunction of file.exports) {
      const ownCalls = file.ownCalls.get(exportedFunction.exportName) ?? 0;
      const externalCalls =
        externalUsageCounts.get(
          makeUsageKey(file.filePath, exportedFunction.exportName)
        ) ?? 0;
      if (ownCalls > 0 && externalCalls === 0) {
        violations.push({
          filePath: deps.pathModule.relative(deps.rootDir, file.filePath),
          line: exportedFunction.line,
          column: exportedFunction.column,
          exportName: exportedFunction.exportName,
          ownCalls,
        });
      }
    }
  }
  return violations;
}

/**
 * @returns {OverexposedExportsDeps['pathModule']} Default path helpers.
 */
function createDefaultPathModule() {
  return {
    join: (...segments) => segments.join('/'),
    resolve: (...segments) => segments.join('/'),
    relative: (_from, to) => to,
    sep: '/',
  };
}

/**
 * List JavaScript source files below a root directory.
 * @param {OverexposedExportsDeps} deps Filesystem dependencies.
 * @param {string} sourceRoot Source tree root.
 * @returns {string[]} File paths.
 */
function listJavaScriptFiles(deps, sourceRoot) {
  const root = deps.pathModule.resolve(deps.rootDir, sourceRoot);
  /** @type {string[]} */
  const files = [];
  walkDir(deps, root, files);
  return files;
}

/**
 * Walk a directory tree and collect `.js` files.
 * @param {OverexposedExportsDeps} deps Filesystem dependencies.
 * @param {string} dirPath Directory path.
 * @param {string[]} files Output file list.
 * @returns {void}
 */
function walkDir(deps, dirPath, files) {
  for (const entry of deps.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = deps.pathModule.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkDir(deps, entryPath, files);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(entryPath);
    }
  }
}

/**
 * Analyze a source file for exported functions and calls.
 * @param {OverexposedExportsDeps} deps Filesystem dependencies.
 * @param {string} filePath Absolute file path.
 * @returns {FileAnalysis} File analysis result.
 */
function analyzeSourceFile(deps, filePath) {
  const source = deps.readFileSync(filePath, 'utf8');
  const parse = deps.parse ?? DEFAULT_PARSE;
  const ast = parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    loc: true,
    range: true,
  });

  /** @type {Array<{ exportName: string, line: number, column: number }>} */
  const exports = [];
  /** @type {Map<string, number>} */
  const ownCalls = new Map();
  /** @type {Map<string, { source: string, importedName: string, namespace: boolean }>} */
  const imports = new Map();

  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration') {
      collectImportSpecifiers(node, imports);
      continue;
    }

    if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      collectExportedFunctionsFromDeclaration(node.declaration, exports);
      continue;
    }

    if (node.type === 'ExportDefaultDeclaration') {
      collectExportedFunctionsFromDefault(
        /** @type {any} */ (node.declaration),
        exports
      );
    }
  }

  /** @type {Array<{ source: string, exportName: string }>} */
  const importedCalls = [];
  traverse(ast, current =>
    handleCallExpression(current, imports, exports, ownCalls, importedCalls)
  );

  return { filePath, exports, ownCalls, importedCalls };
}

/**
 * Collect exported functions from a declaration statement.
 * @param {import('estree').Statement} declaration Declaration node.
 * @param {Array<{ exportName: string, line: number, column: number }>} exports Export accumulator.
 * @returns {void}
 */
function collectExportedFunctionsFromDeclaration(declaration, exports) {
  if (declaration.type === 'FunctionDeclaration') {
    if (declaration.id?.name) {
      pushExportedFunction(exports, declaration.id.name, declaration.loc);
    }
    return;
  }

  if (declaration.type !== 'VariableDeclaration') {
    return;
  }

  for (const declarator of declaration.declarations) {
    if (!isExportableFunctionDeclarator(declarator)) {
      continue;
    }
    const identifier = /** @type {import('estree').Identifier} */ (
      declarator.id
    );
    pushExportedFunction(exports, identifier.name, declarator.loc);
  }
}

/**
 * @param {import('estree').VariableDeclarator} declarator Candidate declarator.
 * @returns {boolean} True when the declarator exports a function.
 */
function isExportableFunctionDeclarator(declarator) {
  return (
    declarator.id.type === 'Identifier' &&
    declarator.init !== null &&
    declarator.init !== undefined &&
    (declarator.init.type === 'ArrowFunctionExpression' ||
      declarator.init.type === 'FunctionExpression')
  );
}

/**
 * Collect imported names from an import declaration.
 * @param {import('estree').ImportDeclaration} declaration Import declaration node.
 * @param {Map<string, { source: string, importedName: string, namespace: boolean }>} imports Import accumulator.
 * @returns {void}
 */
function collectImportSpecifiers(declaration, imports) {
  for (const specifier of declaration.specifiers) {
    if (specifier.type === 'ImportNamespaceSpecifier') {
      imports.set(specifier.local.name, {
        source: String(declaration.source.value),
        importedName: '*',
        namespace: true,
      });
      continue;
    }

    imports.set(specifier.local.name, {
      source: String(declaration.source.value),
      importedName: getImportedName(specifier),
      namespace: false,
    });
  }
}

/**
 * @param {import('estree').ImportSpecifier | import('estree').ImportDefaultSpecifier} specifier Import specifier.
 * @returns {string} Imported name.
 */
function getImportedName(specifier) {
  if (specifier.type === 'ImportDefaultSpecifier') {
    return 'default';
  }

  if (specifier.imported.type === 'Identifier') {
    return specifier.imported.name;
  }

  return String(specifier.imported.value);
}

/**
 * @param {{ source: string, importedName: string }} imported Imported call details.
 * @returns {{ source: string, exportName: string }} Imported call record.
 */
function makeImportedCall(imported) {
  return {
    source: imported.source,
    exportName: imported.importedName,
  };
}

/**
 * @param {{ source: string }} imported Imported namespace details.
 * @param {string} exportName Export name.
 * @returns {{ source: string, exportName: string }} Imported namespace call record.
 */
function makeNamespaceCall(imported, exportName) {
  return {
    source: imported.source,
    exportName,
  };
}

/**
 * @param {import('estree').Node} current Current AST node.
 * @param {Map<string, { source: string, importedName: string, namespace: boolean }>} imports Import accumulator.
 * @param {Array<{ exportName: string, line: number, column: number }>} exports Export accumulator.
 * @param {Map<string, number>} ownCalls Own-call counts.
 * @param {Array<{ source: string, exportName: string }>} importedCalls Imported call records.
 * @returns {void}
 */
/* eslint-disable max-params, complexity */
/**
 * @param {import('estree').Node} current Current AST node.
 * @param {Map<string, { source: string, importedName: string, namespace: boolean }>} imports Import accumulator.
 * @param {Array<{ exportName: string, line: number, column: number }>} exports Export accumulator.
 * @param {Map<string, number>} ownCalls Own-call counts.
 * @param {Array<{ source: string, exportName: string }>} importedCalls Imported call records.
 * @returns {void}
 */
function handleCallExpression(
  current,
  imports,
  exports,
  ownCalls,
  importedCalls
) {
  if (current.type !== 'CallExpression') {
    return;
  }

  const callee = current.callee;
  if (callee.type === 'Identifier') {
    if (imports.has(callee.name)) {
      const imported = imports.get(callee.name);
      if (!imported) {
        return;
      }
      importedCalls.push(makeImportedCall(imported));
    } else if (exports.some(exported => exported.exportName === callee.name)) {
      ownCalls.set(callee.name, (ownCalls.get(callee.name) ?? 0) + 1);
    }
    return;
  }

  if (isNamespaceCall(callee)) {
    const imported = imports.get(callee.object.name);
    if (imported?.namespace) {
      importedCalls.push(makeNamespaceCall(imported, callee.property.name));
    }
  }
}
/* eslint-enable max-params, complexity */

/**
 * @param {import('estree').Expression} callee Call target.
 * @returns {callee is import('estree').MemberExpression & { object: import('estree').Identifier, property: import('estree').Identifier }} True when the callee is a namespace import call.
 */
function isNamespaceCall(callee) {
  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.property.type === 'Identifier'
  );
}

/**
 * Collect exported functions from a default export declaration.
 * @param {any} declaration Default export declaration.
 * @param {Array<{ exportName: string, line: number, column: number }>} exports Export accumulator.
 * @returns {void}
 */
function collectExportedFunctionsFromDefault(declaration, exports) {
  if (declaration.type === 'FunctionDeclaration' && declaration.id?.name) {
    pushExportedFunction(exports, declaration.id.name, declaration.loc);
  }
}

/**
 * Push a normalized export record.
 * @param {Array<{ exportName: string, line: number, column: number }>} exports Export accumulator.
 * @param {string} exportName Exported name.
 * @param {{ start?: { line?: number, column?: number } } | null | undefined} loc Source location.
 * @returns {void}
 */
function pushExportedFunction(exports, exportName, loc) {
  const start = loc?.start;
  exports.push({
    exportName,
    line: start?.line ?? 1,
    column: start?.column ?? 0,
  });
}

/**
 * Determine whether a node is function-like.
 * @param {import('estree').Node} node AST node.
 * @returns {boolean} True when the node is a function expression or arrow function.
 */
function isFunctionLike(node) {
  return (
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

/**
 * Traverse an AST depth-first.
 * @param {unknown} node AST node.
 * @param {(node: import('estree').Node) => void} visitor Node visitor.
 * @returns {void}
 */
function traverse(node, visitor) {
  if (!node || typeof node !== 'object') {
    return;
  }

  const astNode =
    /** @type {import('estree').Node & Record<string, unknown>} */ (node);
  if (typeof astNode.type === 'string') {
    visitor(astNode);
  }

  for (const value of Object.values(astNode)) {
    if (Array.isArray(value)) {
      for (const child of value) {
        traverse(child, visitor);
      }
      continue;
    }

    traverse(value, visitor);
  }
}

/**
 * Resolve a relative import source to a file path.
 * @param {OverexposedExportsDeps} deps Filesystem dependencies.
 * @param {string} fromFile Importing file.
 * @param {string} sourceLiteral Import source literal.
 * @param {Set<string>} [moduleIndex] Analyzed file paths.
 * @returns {string | null} Resolved file path.
 */
function resolveImportSource(deps, fromFile, sourceLiteral, moduleIndex) {
  if (!sourceLiteral.startsWith('.')) {
    return null;
  }

  const fromDir = fromFile.slice(0, fromFile.lastIndexOf(deps.pathModule.sep));
  const base = deps.pathModule.resolve(fromDir, sourceLiteral);
  const candidates = [
    base,
    `${base}.js`,
    deps.pathModule.join(base, 'index.js'),
  ];
  if (!moduleIndex) {
    return candidates[0] ?? null;
  }

  return candidates.find(candidate => moduleIndex.has(candidate)) ?? null;
}

/**
 * Build a usage key.
 * @param {string} filePath Module file path.
 * @param {string} exportName Exported name.
 * @returns {string} Stable usage key.
 */
function makeUsageKey(filePath, exportName) {
  return `${filePath}::${exportName}`;
}

/**
 * Exported test helpers.
 */
export const checkOverexposedExportsTestOnly = {
  analyzeSourceFile,
  collectExportedFunctionsFromDeclaration,
  collectExportedFunctionsFromDefault,
  isFunctionLike,
  listJavaScriptFiles,
  makeUsageKey,
  readExemptions,
  resolveImportSource,
  traverse,
};
