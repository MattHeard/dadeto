import fs from 'node:fs';
import path from 'node:path';
import istanbulCoverage from 'istanbul-lib-coverage';
import { createWriteCoverageSummaryHandle } from '../core/scripts/write-coverage-summary.js';

const { createCoverageMap } = istanbulCoverage;

const coverageDir = path.resolve('reports/coverage');
const coverageFinalPath = path.join(coverageDir, 'coverage-final.json');
const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json');

const handle = createWriteCoverageSummaryHandle({
  readFile: fs.readFileSync,
  writeFile: fs.writeFileSync,
  createCoverageMap,
  coverageFinalPath,
  coverageSummaryPath,
});

handle();
