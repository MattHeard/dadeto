import { reportFailuresAndMaybeLogSuccess } from '../commonCore.js';
const LOGIC_IMPORT_MARKERS = [
  '../core/',
  '../logic/core/',
  '../logic/boundary/',
];
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
  return checkBuildEntrypoints.bind(
    null,
    readJson,
    readSource,
    output,
    setExitCode
  );
}

/**
 * Evaluate and report the current configured build entrypoints.
 * @param {(filePath: string) => { entrypoints: string[] }} readJson Configuration reader.
 * @param {(filePath: string) => string} readSource Source reader.
 * @param {{ error: (line: string) => void, log: (line: string) => void }} output Gate output.
 * @param {(exitCode: number) => void} setExitCode Exit status setter.
 * @returns {void}
 */
function checkBuildEntrypoints(readJson, readSource, output, setExitCode) {
  const entrypoints = readJson(CONFIG_PATH).entrypoints;
  const failures = getBuildEntrypointPatternFailures({
    entrypoints,
    readSource,
  });
  reportFailuresAndMaybeLogSuccess({
    failures,
    output,
    setExitCode,
    successMessage: `Checked ${entrypoints.length} build entrypoints for the object-passing pattern.`,
  });
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
  return createValidationFailure(
    filePath,
    source.startsWith('#!/usr/bin/env node'),
    'missing shebang'
  );
}

/**
 * Validate entrypoint imports.
 * @param {string} filePath Entrypoint file path.
 * @param {string} source Entrypoint source.
 * @returns {string[]} Failure lines.
 */
function validateImports(filePath, source) {
  return createValidationFailure(
    filePath,
    hasExpectedImportSplit(source),
    'imports are not in the expected env/core split'
  );
}

/**
 * Validate the entrypoint top-level function policy.
 * @param {string} filePath Entrypoint file path.
 * @param {string} source Entrypoint source.
 * @returns {string[]} Failure lines.
 */
function validateTopLevelFunctions(filePath, source) {
  return createValidationFailure(
    filePath,
    !hasTopLevelFunctions(source),
    'top-level functions are not allowed'
  );
}

/**
 * Validate that entrypoint execution stays direct.
 * @param {string} filePath Entrypoint file path.
 * @param {string} source Entrypoint source.
 * @returns {string[]} Failure lines.
 */
function validateExecutionSnippet(filePath, source) {
  return createValidationFailure(
    filePath,
    REQUIRED_EXECUTION_SNIPPETS.some(snippet => source.includes(snippet)),
    'required direct execution pattern snippets are missing'
  );
}

/**
 * Return a single-line validation failure when a check does not pass.
 * @param {string} filePath Entrypoint file path.
 * @param {boolean} passed Whether the validation passed.
 * @param {string} message Failure message suffix.
 * @returns {string[]} Either an empty list or one failure line.
 */
function createValidationFailure(filePath, passed, message) {
  if (passed) {
    return [];
  }

  return [`${filePath}: ${message}`];
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
    importLines.filter(isLogicImport).length === 1 &&
    importLines.filter(line => !isLogicImport(line)).length >= 1
  );
}

/**
 * Preserve the existing import-line heuristic across every logic namespace.
 * @param {string} line Source import line.
 * @returns {boolean} Whether the line names a logic dependency.
 */
function isLogicImport(line) {
  return LOGIC_IMPORT_MARKERS.some(marker => line.includes(marker));
}

/**
 * Detect the existing line-start named-function pattern.
 * @param {string} source Entrypoint source.
 * @returns {boolean} Whether a matching function declaration exists.
 */
function hasTopLevelFunctions(source) {
  return /^function\s+[A-Za-z0-9_$]/mu.test(source);
}
