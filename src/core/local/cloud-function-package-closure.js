/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/**
 * @typedef {{
 *   readFileSync: (path: string, encoding: 'utf8') => string,
 *   existsSync: (path: string) => boolean,
 *   readdirSync: (path: string) => string[],
 *   statSync: (path: string) => {isFile: () => boolean},
 * }} VerifierFilesystem
 * @typedef {{
 *   resolve: (...parts: string[]) => string,
 *   join: (...parts: string[]) => string,
 *   basename: (path: string) => string,
 *   dirname: (path: string) => string,
 *   relative: (from: string, to: string) => string,
 *   sep: string,
 * }} VerifierPaths
 */

/**
 * @typedef {{type?: string, source?: {value?: unknown}, callee?: {type?: string, name?: string}, arguments?: Array<{value?: unknown}>, [key: string]: unknown}} AstNode
 * @typedef {{file: string, specifier: string | null, reason: string}} PackageIssue
 * @typedef {{packageName: string, moduleCount: number, importCount: number, issues: PackageIssue[]}} PackageReport
 */

const MODULE_DECLARATION_TYPES = new Set([
  'ImportDeclaration',
  'ExportAllDeclaration',
  'ExportNamedDeclaration',
  'ImportExpression',
]);
const TERRAFORM_SOURCE_DIR =
  /source_dir\s*=\s*"\$\{path\.module\}\/cloud-functions\/([^"}]+)"/g;

/**
 * Find the Cloud Function directories Terraform archives from its source trees.
 * @param {string[]} terraformSources Terraform configuration contents.
 * @returns {string[]} Unique Cloud Function directory names.
 */
export function getCloudFunctionArchiveDirectories(terraformSources) {
  const directories = terraformSources.flatMap(source =>
    [...source.matchAll(TERRAFORM_SOURCE_DIR)].map(match => match[1])
  );
  return [...new Set(directories)].sort();
}

/**
 * Create the package verifier with its JavaScript parser supplied by the local layer.
 * @param {(source: string, options: {allowHashBang: boolean, ecmaVersion: 'latest', sourceType: 'module'}) => AstNode} parseModule JavaScript parser implementation.
 * @param {VerifierPaths} path Pure path operations.
 * @param {readonly string[]} builtinModuleNames Platform builtin names.
 * @param {(permission: AllowEffects, line: string) => void} [defaultWriteLine] Permission-first diagnostic writer.
 * @returns {{main: (permission: AllowEffects, options: {rootDirectory: string, fileSystem: VerifierFilesystem, writeLine?: (permission: AllowEffects, line: string) => void}) => Promise<number>, inspectCloudFunctionPackage: (packageRoot: string, fileSystem: VerifierFilesystem) => PackageReport}} Verifier entrypoints.
 */
export function createCloudFunctionPackageVerifier(
  parseModule,
  path,
  builtinModuleNames,
  defaultWriteLine = () => {}
) {
  const NODE_BUILTINS = new Set([
    ...builtinModuleNames,
    ...builtinModuleNames.map(moduleName => `node:${moduleName}`),
  ]);
  /**
   * Verify imports reachable from a generated Cloud Function entrypoint.
   * @param {string} packageRoot Generated package directory used by Terraform.
   * @param {VerifierFilesystem} fileSystem Synchronous filesystem adapter.
   * @returns {PackageReport} Package closure result.
   */
  function inspectCloudFunctionPackage(packageRoot, fileSystem) {
    const root = path.resolve(packageRoot);
    const packageName = path.basename(root);
    /** @type {PackageIssue[]} */
    const issues = [];
    const manifest = readPackageManifest(root, fileSystem, issues);
    if (manifest === null)
      return createPackageReport(packageName, 0, 0, issues);
    const { moduleCount, importCount } = inspectModuleClosure(
      root,
      manifest,
      fileSystem,
      issues
    );
    return createPackageReport(packageName, moduleCount, importCount, issues);
  }

  /**
   * Walk the static runtime imports reachable from a generated package entrypoint.
   * @param {string} root Generated package directory.
   * @param {Record<string, unknown>} manifest Parsed package manifest.
   * @param {VerifierFilesystem} fileSystem Synchronous filesystem adapter.
   * @param {PackageIssue[]} issues Issue list to append to.
   * @returns {{moduleCount: number, importCount: number}} Traversal counts.
   */
  function inspectModuleClosure(root, manifest, fileSystem, issues) {
    const entrypoint = path.join(root, 'index.js');
    const declaredDependencies = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.optionalDependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ]);
    /**
     * Validate one import against its package archive or runtime manifest.
     * @param {string} filePath Importing module.
     * @param {string} specifier Import specifier.
     * @returns {string | null} Local module path to traverse, or null otherwise.
     */
    function resolveRuntimeImport(filePath, specifier) {
      if (NODE_BUILTINS.has(specifier)) return null;
      const relativeFile = path.relative(root, filePath);
      let issueReason = null;
      let localPath = null;
      if (!specifier.startsWith('.')) {
        const dependencyName = getPackageName(specifier);
        if (!declaredDependencies.has(dependencyName)) {
          issueReason = `external package ${dependencyName} is not declared`;
        }
      } else {
        localPath = path.resolve(path.dirname(filePath), specifier);
        issueReason = getLocalImportIssue(root, localPath, fileSystem);
      }
      if (issueReason) {
        recordPackageIssue(issues, relativeFile, specifier, issueReason);
        return null;
      }
      return localPath;
    }

    if (!fileSystem.existsSync(entrypoint)) {
      recordPackageIssue(
        issues,
        'index.js',
        null,
        'missing package entrypoint'
      );
    }
    const pending = fileSystem.existsSync(entrypoint) ? [entrypoint] : [];
    const visited = new Set();
    let importCount = 0;

    while (pending.length > 0) {
      const filePath = /** @type {string} */ (pending.pop());
      if (visited.has(filePath)) continue;
      visited.add(filePath);
      const specifiers = readModuleSpecifiers(
        root,
        filePath,
        fileSystem,
        issues
      );
      if (specifiers === null) continue;

      for (const specifier of specifiers) {
        importCount += 1;
        const importedPath = resolveRuntimeImport(filePath, specifier);
        if (importedPath !== null) pending.push(importedPath);
      }
    }

    return { moduleCount: visited.size, importCount };
  }

  /**
   * Parse a generated module and collect its statically named runtime imports.
   * @param {string} root Generated package directory.
   * @param {string} filePath Module path being parsed.
   * @param {VerifierFilesystem} fileSystem Synchronous filesystem adapter.
   * @param {PackageIssue[]} issues Issue list to append to.
   * @returns {string[] | null} Module specifiers, or null when parsing fails.
   */
  function readModuleSpecifiers(root, filePath, fileSystem, issues) {
    try {
      const source = fileSystem.readFileSync(filePath, 'utf8');
      const ast = parseModule(source, {
        allowHashBang: true,
        ecmaVersion: 'latest',
        sourceType: 'module',
      });
      return collectModuleSpecifiers(ast);
    } catch (error) {
      recordPackageIssue(
        issues,
        path.relative(root, filePath),
        null,
        `invalid JavaScript: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Check generated package trees referenced by Terraform archive_file blocks.
   * @param {AllowEffects} permission Invocation permission.
   * @param {{rootDirectory: string, fileSystem: VerifierFilesystem, writeLine?: (permission: AllowEffects, line: string) => void}} options Command adapters.
   * @returns {Promise<number>} Process exit status.
   */
  async function main(
    permission,
    { rootDirectory, fileSystem, writeLine = defaultWriteLine }
  ) {
    const infraDirectory = path.join(rootDirectory, 'infra');
    const terraformSources = fileSystem
      .readdirSync(infraDirectory)
      .filter(fileName => fileName.endsWith('.tf'))
      .map(fileName =>
        fileSystem.readFileSync(path.join(infraDirectory, fileName), 'utf8')
      );
    const packageDirectories =
      getCloudFunctionArchiveDirectories(terraformSources);
    if (packageDirectories.length === 0) {
      writeLine(
        permission,
        'No Terraform Cloud Function archive directories were found.'
      );
      return 1;
    }

    const packageReports = packageDirectories.map(directoryName =>
      inspectCloudFunctionPackage(
        path.join(infraDirectory, 'cloud-functions', directoryName),
        fileSystem
      )
    );
    const failures = packageReports.flatMap(report =>
      report.issues.map(issue => ({ packageName: report.packageName, issue }))
    );
    if (failures.length > 0) {
      failures.forEach(({ packageName, issue }) =>
        writeLine(
          permission,
          `${packageName}/${issue.file} ${issue.specifier ?? ''}: ${issue.reason}`
        )
      );
      writeLine(
        permission,
        `Cloud package verification found ${failures.length} issue(s).`
      );
      return 1;
    }

    const moduleCount = packageReports.reduce(
      (total, report) => total + report.moduleCount,
      0
    );
    const importCount = packageReports.reduce(
      (total, report) => total + report.importCount,
      0
    );
    writeLine(
      permission,
      `Verified ${packageReports.length} Terraform Cloud Function packages, ${moduleCount} reachable modules, and ${importCount} imports.`
    );
    return 0;
  }

  /**
   * Read a generated package manifest and report unreadable or missing inputs.
   * @param {string} root Generated package directory.
   * @param {VerifierFilesystem} fileSystem Synchronous filesystem adapter.
   * @param {PackageIssue[]} issues Issue list to append to.
   * @returns {Record<string, unknown> | null} Parsed package manifest.
   */
  function readPackageManifest(root, fileSystem, issues) {
    const manifestPath = path.join(root, 'package.json');
    /** @type {Record<string, unknown> | null} */
    let manifest = null;
    /** @type {string | null} */
    let issueReason = null;
    if (fileSystem.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fileSystem.readFileSync(manifestPath, 'utf8'));
      } catch (error) {
        issueReason = `invalid package manifest: ${error.message}`;
      }
    } else {
      issueReason = 'missing package manifest';
    }
    if (issueReason)
      recordPackageIssue(issues, 'package.json', null, issueReason);
    return issueReason ? null : manifest;
  }

  /**
   * Return why a resolved relative module cannot be part of the archive.
   * @param {string} root Generated package directory.
   * @param {string} importedPath Resolved local import path.
   * @param {VerifierFilesystem} fileSystem Synchronous filesystem adapter.
   * @returns {string | null} Failure reason, or null when the file is valid.
   */
  function getLocalImportIssue(root, importedPath, fileSystem) {
    if (
      !importedPath.startsWith(`${root}${path.sep}`) &&
      importedPath !== root
    ) {
      return 'relative import escapes package directory';
    }
    if (!fileSystem.existsSync(importedPath)) {
      return 'relative import is missing from package';
    }
    if (!fileSystem.statSync(importedPath).isFile()) {
      return 'relative import does not resolve to a file';
    }
    return null;
  }

  return { main, inspectCloudFunctionPackage };
}

/**
 * Traverse an Acorn AST and collect import/export/require module names.
 * @param {AstNode} rootNode Parsed module AST.
 * @returns {string[]} Statically named module specifiers.
 */
function collectModuleSpecifiers(rootNode) {
  const specifiers = [];
  const pending = /** @type {unknown[]} */ ([rootNode]);
  while (pending.length > 0) {
    const node = pending.pop();
    if (Array.isArray(node)) {
      pending.push(...node);
      continue;
    }
    if (!node || typeof node !== 'object') continue;
    const astNode = /** @type {AstNode} */ (node);
    if (
      MODULE_DECLARATION_TYPES.has(astNode.type ?? '') &&
      typeof astNode.source?.value === 'string'
    ) {
      specifiers.push(astNode.source.value);
    }
    if (
      astNode.type === 'CallExpression' &&
      astNode.callee?.type === 'Identifier' &&
      astNode.callee.name === 'require' &&
      typeof astNode.arguments?.[0]?.value === 'string'
    ) {
      specifiers.push(astNode.arguments[0].value);
    }
    Object.entries(astNode).forEach(([key, value]) => {
      if (['start', 'end', 'loc', 'source'].includes(key)) return;
      if (value && typeof value === 'object') pending.push(value);
    });
  }
  return specifiers;
}

/**
 * Extract a package's root name from its module specifier.
 * @param {string} specifier External module specifier.
 * @returns {string} Root package name.
 */
function getPackageName(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/**
 * Append one package-verification issue.
 * @param {PackageIssue[]} issues Issue list.
 * @param {string} file Relative module path.
 * @param {string | null} specifier Import name or null.
 * @param {string} reason Diagnostic.
 */
function recordPackageIssue(issues, file, specifier, reason) {
  issues.push({ file, specifier, reason });
}

/**
 * Build the report returned for one generated package.
 * @param {string} packageName Archive name.
 * @param {number} moduleCount Reachable module count.
 * @param {number} importCount Import count.
 * @param {PackageIssue[]} issues Diagnostics.
 * @returns {PackageReport} Verification report.
 */
function createPackageReport(packageName, moduleCount, importCount, issues) {
  return { packageName, moduleCount, importCount, issues };
}
