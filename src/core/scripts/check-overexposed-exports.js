import { readExemptions } from './read-exemptions.js';

const DEFAULT_ROOT_DIR = '.';
const DEFAULT_SOURCE_ROOT = 'src';
const DEFAULT_CONFIG_PATH = 'overexposed-exports-exemptions.json';
const DEFAULT_PARSE = () => ({ type: 'Program', body: [] });
const DEFAULT_STDOUT = { write() {} };
const DEFAULT_STDERR = { write() {} };

/**
 * @typedef {{
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>,
 *   rootDir: string,
 *   sourceRoot: string,
 *   configPath: string,
 *   parse: (source: string, options: { ecmaVersion: string, sourceType: string, loc: boolean, range: boolean }) => import('estree').Program,
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

    deps.stderr.write(
      `Found ${violations.length} over-exposed export${violations.length === 1 ? '' : 's'}.\n`
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
 * Normalize the gate dependencies with defaults.
 * @param {{
 *   readFileSync?: (filePath: string, encoding: 'utf8') => string,
 *   readdirSync?: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   rootDir?: string,
 *   sourceRoot?: string,
 *   configPath?: string,
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
    pathModule:
      options.pathModule ??
      /** @type {OverexposedExportsDeps['pathModule']} */ ({
        join: (...segments) => segments.join('/'),
        resolve: (...segments) => segments.join('/'),
        relative: (_from, to) => to,
        sep: '/',
      }),
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
  const ast = deps.parse(source, {
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
      for (const specifier of node.specifiers) {
        if (specifier.type === 'ImportNamespaceSpecifier') {
          imports.set(specifier.local.name, {
            source: node.source.value,
            importedName: '*',
            namespace: true,
          });
          continue;
        }

        imports.set(specifier.local.name, {
          source: node.source.value,
          importedName:
            specifier.type === 'ImportDefaultSpecifier'
              ? 'default'
              : specifier.imported.name,
          namespace: false,
        });
      }
      continue;
    }

    if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      collectExportedFunctionsFromDeclaration(node.declaration, exports);
      continue;
    }

    if (node.type === 'ExportDefaultDeclaration') {
      collectExportedFunctionsFromDefault(node.declaration, exports);
    }
  }

  /** @type {Array<{ source: string, exportName: string }>} */
  const importedCalls = [];
  traverse(ast, current => {
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
        importedCalls.push({
          source: imported.source,
          exportName: imported.importedName,
        });
      } else if (
        exports.some(exported => exported.exportName === callee.name)
      ) {
        ownCalls.set(callee.name, (ownCalls.get(callee.name) ?? 0) + 1);
      }
      return;
    }

    if (
      callee.type === 'MemberExpression' &&
      !callee.computed &&
      callee.object.type === 'Identifier' &&
      callee.property.type === 'Identifier'
    ) {
      const imported = imports.get(callee.object.name);
      if (imported?.namespace) {
        importedCalls.push({
          source: imported.source,
          exportName: callee.property.name,
        });
      }
    }
  });

  return { filePath, exports, ownCalls, importedCalls };
}

/**
 * Collect exported functions from a declaration statement.
 * @param {import('estree').Statement} declaration Declaration node.
 * @param {Array<{ exportName: string, line: number, column: number }>} exports Export accumulator.
 * @returns {void}
 */
function collectExportedFunctionsFromDeclaration(declaration, exports) {
  if (declaration.type === 'FunctionDeclaration' && declaration.id?.name) {
    exports.push({
      exportName: declaration.id.name,
      line: declaration.loc?.start.line ?? 1,
      column: declaration.loc?.start.column ?? 0,
    });
    return;
  }

  if (declaration.type !== 'VariableDeclaration') {
    return;
  }

  for (const declarator of declaration.declarations) {
    if (
      declarator.id.type === 'Identifier' &&
      declarator.init &&
      (declarator.init.type === 'ArrowFunctionExpression' ||
        declarator.init.type === 'FunctionExpression')
    ) {
      exports.push({
        exportName: declarator.id.name,
        line: declarator.loc?.start.line ?? 1,
        column: declarator.loc?.start.column ?? 0,
      });
    }
  }
}

/**
 * Collect exported functions from a default export declaration.
 * @param {import('estree').Expression | import('estree').Declaration} declaration Default export declaration.
 * @param {Array<{ exportName: string, line: number, column: number }>} exports Export accumulator.
 * @returns {void}
 */
function collectExportedFunctionsFromDefault(declaration, exports) {
  if (declaration.type === 'FunctionDeclaration' && declaration.id?.name) {
    exports.push({
      exportName: declaration.id.name,
      line: declaration.loc?.start.line ?? 1,
      column: declaration.loc?.start.column ?? 0,
    });
  }
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
