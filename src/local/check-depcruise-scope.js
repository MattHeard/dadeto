import * as espree from 'espree';
import * as eslintScope from 'eslint-scope';

/**
 * Create parser deps for depcruise scope analysis.
 * @returns {{
 *   parseSourceForScopeAnalysis: (source: string) => unknown,
 *   analyzeScope: (ast: unknown) => { scopes: Array<{ through: Array<{ identifier?: { name?: string } }> }> },
 * }} Parser dependencies.
 */
export function createCheckDepcruiseScopeDeps() {
  return {
    parseSourceForScopeAnalysis: parseSourceForScopeAnalysisWithEspree,
    analyzeScope: analyzeScopeWithEslintScope,
  };
}

/**
 * Parse source for scope analysis.
 * @param {string} source Source text.
 * @returns {unknown} Parsed program.
 */
function parseSourceForScopeAnalysisWithEspree(source) {
  return espree.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    range: true,
    loc: true,
    comment: true,
  });
}

/**
 * Analyze scope information for a parsed source program.
 * @param {unknown} ast Parsed program.
 * @returns {{ scopes: Array<{ through: Array<{ identifier?: { name?: string } }> }> }} Scope manager.
 */
function analyzeScopeWithEslintScope(ast) {
  return eslintScope.analyze(ast, {
    ecmaVersion: 2024,
    sourceType: 'module',
  });
}
