const CONFIG_PATH = 'src/build/entrypoint-patterns.json';
const REQUIRED_EXECUTION_SNIPPETS = [
  'const environmentDependencies = {',
  'executeCopyDendriteWorkflow(environmentDependencies);',
  'createCopyCore(environmentDependencies).runCopyWorkflow();',
];

/**
 * Create the command handler for the build entrypoint pattern check.
 * @param {{
 *   readJson: (filePath: string) => { entrypoints: string[] },
 *   readSource: (filePath: string) => string,
 *   output: { error: (line: string) => void, log: (line: string) => void },
 *   setExitCode: (exitCode: number) => void,
 * }} deps Command dependencies.
 * @returns {() => void} Handler that validates configured build entrypoints.
 */
export function createBuildEntrypointPatternHandle({
  readJson,
  readSource,
  output,
  setExitCode,
}) {
  return () => {
    const entrypoints = readJson(CONFIG_PATH).entrypoints;
    const failures = getBuildEntrypointPatternFailures({
      entrypoints,
      readSource,
    });

    if (failures.length > 0) {
      failures.forEach(failure => {
        output.error(failure);
      });
      setExitCode(1);
      return;
    }

    output.log(
      `Checked ${entrypoints.length} build entrypoints for the object-passing pattern.`
    );
  };
}

/**
 * Get build entrypoint pattern failures.
 * @param {{
 *   entrypoints: string[],
 *   readSource: (filePath: string) => string,
 * }} options Entrypoint check options.
 * @returns {string[]} Failure lines.
 */
export function getBuildEntrypointPatternFailures({ entrypoints, readSource }) {
  return entrypoints.flatMap(filePath =>
    getFilePatternFailures(filePath, readSource(filePath))
  );
}

/**
 * Get pattern failures for one build entrypoint file.
 * @param {string} filePath Entrypoint file path.
 * @param {string} source Entrypoint source.
 * @returns {string[]} Failure lines.
 */
function getFilePatternFailures(filePath, source) {
  return [
    validateShebang,
    validateImports,
    validateTopLevelFunctions,
    validateExecutionSnippet,
  ].flatMap(validate => validate(filePath, source));
}

/**
 * Validate the entrypoint shebang.
 * @param {string} filePath Entrypoint file path.
 * @param {string} source Entrypoint source.
 * @returns {string[]} Failure lines.
 */
function validateShebang(filePath, source) {
  if (source.startsWith('#!/usr/bin/env node')) {
    return [];
  }

  return [`${filePath}: missing shebang`];
}

/**
 * Validate entrypoint imports.
 * @param {string} filePath Entrypoint file path.
 * @param {string} source Entrypoint source.
 * @returns {string[]} Failure lines.
 */
function validateImports(filePath, source) {
  if (hasExpectedImportSplit(source)) {
    return [];
  }

  return [`${filePath}: imports are not in the expected env/core split`];
}

/**
 * Validate the entrypoint top-level function policy.
 * @param {string} filePath Entrypoint file path.
 * @param {string} source Entrypoint source.
 * @returns {string[]} Failure lines.
 */
function validateTopLevelFunctions(filePath, source) {
  if (getTopLevelFunctionNames(source).size === 0) {
    return [];
  }

  return [`${filePath}: top-level functions are not allowed`];
}

/**
 * Validate that entrypoint execution stays direct.
 * @param {string} filePath Entrypoint file path.
 * @param {string} source Entrypoint source.
 * @returns {string[]} Failure lines.
 */
function validateExecutionSnippet(filePath, source) {
  if (REQUIRED_EXECUTION_SNIPPETS.some(snippet => source.includes(snippet))) {
    return [];
  }

  return [
    `${filePath}: required direct execution pattern snippets are missing`,
  ];
}

/**
 * Tell whether imports have the expected environment/core split.
 * @param {string} source Entrypoint source.
 * @returns {boolean} True when imports include exactly one core import and at least one environment import.
 */
function hasExpectedImportSplit(source) {
  const importLines = source
    .split('\n')
    .filter(line => line.startsWith('import '));

  return (
    importLines.length >= 2 &&
    importLines.filter(line => line.includes('../core/')).length === 1 &&
    importLines.filter(line => !line.includes('../core/')).length >= 1
  );
}

/**
 * Get top-level function names from source.
 * @param {string} source Entrypoint source.
 * @returns {Set<string>} Top-level function names.
 */
function getTopLevelFunctionNames(source) {
  return new Set(
    [...source.matchAll(/^function\s+([A-Za-z0-9_$]+)/gmu)].map(
      match => match[1]
    )
  );
}
