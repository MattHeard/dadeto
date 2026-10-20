import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * @param {string} directory Temporary coverage directory.
 * @returns {{coverage?: object, coverageError?: string}} Parsed coverage output.
 */
export function readScopedCoverage(directory) {
  try {
    return {
      coverage: JSON.parse(
        readFileSync(path.join(directory, 'coverage-final.json'), 'utf8')
      ),
    };
  } catch (error) {
    return {
      coverageError: `Could not read scoped coverage output: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
