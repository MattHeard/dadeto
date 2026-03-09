import fs from 'node:fs';
import path from 'node:path';
import istanbulCoverage from 'istanbul-lib-coverage';

const { createCoverageMap } = istanbulCoverage;

const coverageDir = path.resolve('reports/coverage');
const coverageFinalPath = path.join(coverageDir, 'coverage-final.json');
const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json');

const rawCoverage = JSON.parse(fs.readFileSync(coverageFinalPath, 'utf8'));
const coverageMap = createCoverageMap(rawCoverage);
const summary = {
  total: coverageMap.getCoverageSummary().toJSON(),
};

for (const filePath of coverageMap.files()) {
  summary[filePath] = coverageMap.fileCoverageFor(filePath).toSummary().toJSON();
}

fs.writeFileSync(coverageSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
