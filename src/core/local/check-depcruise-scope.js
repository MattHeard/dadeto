// @ts-nocheck
import * as espree from 'espree';
import * as eslintScope from 'eslint-scope';

const CORE_GLOBALS = ['localStorage', 'window', 'document'];

/**
 * Find browser-global references in executable source code.
 * @param {string} source Source text.
 * @returns {string[]} Browser global names referenced without a local binding.
 */
export function findBrowserGlobalReferences(source) {
  const ast = parseSourceForScopeAnalysis(source);
  const scopeManager = eslintScope.analyze(ast, {
    ecmaVersion: 2024,
    sourceType: 'module',
  });
  const references = new Set();

  scopeManager.scopes.forEach(scope => {
    scope.through.forEach(reference => {
      const name = reference.identifier?.name;
      if (CORE_GLOBALS.includes(name)) {
        references.add(name);
      }
    });
  });

  return [...references];
}

/**
 * Parse source for scope analysis.
 * @param {string} source Source text.
 * @returns {import('estree').Program} Parsed program.
 */
function parseSourceForScopeAnalysis(source) {
  return espree.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    range: true,
    loc: true,
    comment: true,
  });
}
