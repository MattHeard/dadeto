import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Convert relative import specifiers into absolute file URLs.
 * @param {string} source - Module source to rewrite.
 * @param {string} basePath - File path where the source originally lived.
 * @returns {string} Source text with relative imports rewritten.
 */
export function rewriteRelativeImports(source, basePath) {
  return source.replace(/from '([^']+)'/g, (_, specifier) => {
    if (!specifier.startsWith('.')) {
      return `from '${specifier}'`;
    }

    const resolvedPath = path.resolve(path.dirname(basePath), specifier);
    const resolvedUrl = pathToFileURL(resolvedPath);
    return `from '${resolvedUrl.href}'`;
  });
}
