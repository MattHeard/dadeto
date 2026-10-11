import fs from 'node:fs';
import path from 'node:path';
import istanbulCoverage from 'istanbul-lib-coverage';
import {
  createCoverageReader,
  createCoverageSummaryWriter,
  createWriteCoverageSummaryHandle,
} from '../core/scripts/write-coverage-summary.js';
import { bindEffectBoundary } from './allow-effects.js';

const { createCoverageMap } = istanbulCoverage;

const coverageDir = path.resolve('reports/coverage');
const coverageFinalPath = path.join(coverageDir, 'coverage-final.json');
const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json');

fs.mkdirSync(coverageDir, { recursive: true });

const readCoverage = createCoverageReader(fs.readFileSync, coverageFinalPath);
const writeSummary = createCoverageSummaryWriter(
  (_permission, filePath, contents) => fs.writeFileSync(filePath, contents),
  bindEffectBoundary,
  coverageSummaryPath
);
const handle = createWriteCoverageSummaryHandle({
  readCoverage,
  createCoverageMap,
  writeSummary,
});

await handle();
