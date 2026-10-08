/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

import { isMissingFileError } from '../commonCore.js';

const DEFAULT_COVERAGE_FINAL_PATH = 'reports/coverage/coverage-final.json';
const DEFAULT_COVERAGE_SUMMARY_PATH = 'reports/coverage/coverage-summary.json';

/**
 * Create the command handler that writes the coverage summary file.
 * @param {{
 *   readFile: (filePath: string, encoding: 'utf8') => string,
 *   writeFile: (permission: AllowEffects, filePath: string, contents: string) => void,
 *   bindEffectBoundary: import('../../../types/allow-effects').AllowEffectsBoundary,
 *   createCoverageMap: (rawCoverage: Record<string, unknown>) => {
 *     getCoverageSummary: () => { toJSON: () => Record<string, unknown> },
 *     files: () => string[],
 *     fileCoverageFor: (filePath: string) => { toSummary: () => { toJSON: () => Record<string, unknown> } },
 *   },
 *   coverageFinalPath?: string,
 *   coverageSummaryPath?: string,
 * }} deps Command dependencies.
 * @returns {() => Promise<void>} Handler that reads coverage output and writes the summary.
 */
export function createWriteCoverageSummaryHandle({
  readFile,
  writeFile,
  bindEffectBoundary,
  createCoverageMap,
  coverageFinalPath = DEFAULT_COVERAGE_FINAL_PATH,
  coverageSummaryPath = DEFAULT_COVERAGE_SUMMARY_PATH,
}) {
  return () => {
    let rawCoverage;

    try {
      rawCoverage = JSON.parse(readFile(coverageFinalPath, 'utf8'));
    } catch (error) {
      if (isMissingFileError(error)) {
        throw new Error(
          `Coverage summary could not find ${coverageFinalPath}. Jest likely failed to write coverage output before this post-test step ran.`
        );
      }

      throw error;
    }

    const coverageMap = createCoverageMap(rawCoverage);
    const summary = buildCoverageSummary(coverageMap);

    return bindEffectBoundary(async permission =>
      writeFile(
        permission,
        coverageSummaryPath,
        `${JSON.stringify(summary, null, 2)}\n`
      )
    );
  };
}

/**
 * Build the JSON summary structure from a coverage map.
 * @param {{
 *   getCoverageSummary: () => { toJSON: () => Record<string, unknown> },
 *   files: () => string[],
 *   fileCoverageFor: (filePath: string) => { toSummary: () => { toJSON: () => Record<string, unknown> } },
 * }} coverageMap Istanbul coverage map.
 * @returns {Record<string, unknown>} Coverage summary payload.
 */
export function buildCoverageSummary(coverageMap) {
  const summary = /** @type {Record<string, unknown>} */ ({
    total: coverageMap.getCoverageSummary().toJSON(),
  });

  for (const filePath of coverageMap.files()) {
    summary[filePath] = coverageMap
      .fileCoverageFor(filePath)
      .toSummary()
      .toJSON();
  }

  return summary;
}
