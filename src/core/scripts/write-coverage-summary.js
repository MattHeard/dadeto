const DEFAULT_COVERAGE_FINAL_PATH = 'reports/coverage/coverage-final.json';
const DEFAULT_COVERAGE_SUMMARY_PATH = 'reports/coverage/coverage-summary.json';

/**
 * Create the command handler that writes the coverage summary file.
 * @param {{
 *   readFile: (filePath: string, encoding: 'utf8') => string,
 *   writeFile: (filePath: string, contents: string) => void,
 *   createCoverageMap: (rawCoverage: Record<string, unknown>) => {
 *     getCoverageSummary: () => { toJSON: () => Record<string, unknown> },
 *     files: () => string[],
 *     fileCoverageFor: (filePath: string) => { toSummary: () => { toJSON: () => Record<string, unknown> } },
 *   },
 *   coverageFinalPath?: string,
 *   coverageSummaryPath?: string,
 * }} deps Command dependencies.
 * @returns {() => void} Handler that reads coverage output and writes the summary.
 */
export function createWriteCoverageSummaryHandle({
  readFile,
  writeFile,
  createCoverageMap,
  coverageFinalPath = DEFAULT_COVERAGE_FINAL_PATH,
  coverageSummaryPath = DEFAULT_COVERAGE_SUMMARY_PATH,
}) {
  return () => {
    const rawCoverage = JSON.parse(readFile(coverageFinalPath, 'utf8'));
    const coverageMap = createCoverageMap(rawCoverage);
    const summary = buildCoverageSummary(coverageMap);

    writeFile(coverageSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
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
