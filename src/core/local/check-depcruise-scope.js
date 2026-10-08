export const CORE_GLOBALS = ['localStorage', 'window', 'document'];

/**
 * Create a browser-global reference finder from injected parser dependencies.
 * @param {{
 *   parseSourceForScopeAnalysis: (source: string) => unknown,
 *   analyzeScope: (ast: unknown) => { scopes: Array<{ through: Array<{ identifier?: { name?: string } }> }> },
 * }} deps Parser dependencies.
 * @param {string[]} [coreGlobals] Browser globals to find.
 * @returns {(source: string) => string[]} Browser-global reference finder.
 */
export function createBrowserGlobalReferenceFinder(
  deps,
  coreGlobals = CORE_GLOBALS
) {
  return function findBrowserGlobalReferences(source) {
    const ast = deps.parseSourceForScopeAnalysis(source ?? '');
    const scopeManager = deps.analyzeScope(ast);
    const references = new Set();

    scopeManager.scopes.forEach(scope => {
      scope.through.forEach(reference => {
        const name = /** @type {string} */ (reference.identifier?.name);
        if (coreGlobals.includes(name)) {
          references.add(name);
        }
      });
    });

    return [...references];
  };
}
