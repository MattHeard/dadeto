/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

import { isMissingFileError } from '../commonCore.js';

const DEFAULT_COVERAGE_FINAL_PATH = 'reports/coverage/coverage-final.json';
const DEFAULT_COVERAGE_SUMMARY_PATH = 'reports/coverage/coverage-summary.json';

/**
 * Create a capability that reads and parses the final coverage file.
 * @param {(filePath: string, encoding: 'utf8') => string} readFile File reader.
 * @param {string} coverageFinalPath Path to the final coverage file.
 * @returns {() => Record<string, unknown>} Parsed coverage data reader.
 */
export function createCoverageReader(
  readFile,
  coverageFinalPath = DEFAULT_COVERAGE_FINAL_PATH
) {
  return () => {
    try {
      return /** @type {Record<string, unknown>} */ (
        JSON.parse(readFile(coverageFinalPath, 'utf8'))
      );
    } catch (error) {
      if (isMissingFileError(error)) {
        throw new Error(
          `Coverage summary could not find ${coverageFinalPath}. Jest likely failed to write coverage output before this post-test step ran.`
        );
      }

      throw error;
    }
  };
}

/**
 * Create a capability that writes a formatted coverage summary within the effect boundary.
 * @param {(permission: AllowEffects, filePath: string, contents: string) => void} writeFile Effectful file writer.
 * @param {import('../../../types/allow-effects').AllowEffectsBoundary} bindEffectBoundary Runtime effect boundary.
 * @param {string} coverageSummaryPath Path to the summary output file.
 * @returns {(summary: Record<string, unknown>) => Promise<void>} Summary writer.
 */
export function createCoverageSummaryWriter(
  writeFile,
  bindEffectBoundary,
  coverageSummaryPath = DEFAULT_COVERAGE_SUMMARY_PATH
) {
  return summary =>
    bindEffectBoundary(async permission =>
      writeFile(
        permission,
        coverageSummaryPath,
        `${JSON.stringify(summary, null, 2)}\n`
      )
    );
}

/**
 * Create the command handler that writes the coverage summary file.
 * @param {{
 *   readCoverage: () => Record<string, unknown>,
 *   createCoverageMap: (rawCoverage: Record<string, unknown>) => {
 *     getCoverageSummary: () => { toJSON: () => Record<string, unknown> },
 *     files: () => string[],
 *     fileCoverageFor: (filePath: string) => { toSummary: () => { toJSON: () => Record<string, unknown> } },
 *   },
 *   writeSummary: (summary: Record<string, unknown>) => Promise<void>,
 * }} capabilities Coverage input, projection, and output capabilities.
 * @returns {() => Promise<void>} Handler that reads coverage output and writes the summary.
 */
export function createWriteCoverageSummaryHandle({
  readCoverage,
  createCoverageMap,
  writeSummary,
}) {
  return () =>
    writeSummary(buildCoverageSummary(createCoverageMap(readCoverage())));
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
