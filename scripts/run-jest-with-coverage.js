#!/usr/bin/env node
import fs from 'node:fs';
import { LOGIC_SOURCE_ROOTS } from '../src/core/local/logic-source-paths.js';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { acquireJestSlot } from './jest-pool.js';
import {
  addUncoveredFiles,
  listUncoveredBranches,
  mergeCoverageFragment,
  partitionValues,
  writeCoverageArtifacts,
} from './coverage-shards.js';

const ROOT = process.cwd();
const JEST_BIN = path.resolve(ROOT, 'node_modules/.bin/jest');
const shardSize = Number.parseInt(
  process.env.DADETO_COVERAGE_SHARD_SIZE ?? '40',
  10
);
const finalDir = path.resolve(ROOT, 'reports/coverage');
const coverageRoot =
  process.env.DADETO_COVERAGE_DIR ?? path.join(finalDir, 'work');
const shardRoot = path.join(coverageRoot, 'shards');
const storeRoot = path.join(coverageRoot, 'files');
const coverageFinalPath = path.join(finalDir, 'coverage-final.json');
const coverageSummaryPath = path.join(finalDir, 'coverage-summary.json');
const testRunMetadataPath = path.join(finalDir, 'full-test-run.json');
const workerHeapMb = Number.parseInt(
  process.env.DADETO_COVERAGE_WORKER_HEAP_MB ?? '1024',
  10
);
const progressIntervalMs = resolveProgressIntervalMs(
  process.env.DADETO_CHECK_PROGRESS_INTERVAL_MS
);

fs.rmSync(coverageRoot, { recursive: true, force: true });
fs.mkdirSync(shardRoot, { recursive: true });
fs.mkdirSync(storeRoot, { recursive: true });
fs.mkdirSync(finalDir, { recursive: true });
fs.rmSync(coverageFinalPath, { force: true });
fs.rmSync(coverageSummaryPath, { force: true });

const testRun = {
  commitSha: getCommitSha(),
  status: 'running',
  startedAt: new Date().toISOString(),
  finishedAt: null,
  shardSize,
  workerHeapMb,
  totalShards: null,
  completedShards: 0,
  phase: 'discovering unit tests',
  currentShard: null,
  lastProgressAt: new Date().toISOString(),
  testSuites: null,
  tests: null,
  passed: null,
  failed: null,
  thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
  coverageAvailable: false,
  failureReason: null,
};
writeTestRun();
logProgress(`Coverage run started; discovering unit tests.`);
const progressTimer = setInterval(writeProgress, progressIntervalMs);

let testFiles = [];
let sourceFiles = [];
let sourceKeys = [];
let shards = [];
try {
  testFiles = requestedTestFiles() ?? listTestFiles();
  sourceFiles = listSourceFiles();
  sourceKeys = sourceFiles;
  shards = partitionValues(testFiles, shardSize);
  testRun.totalShards = shards.length;
  testRun.phase = 'waiting for Jest slot';
  writeTestRun();
  logProgress(
    `Discovered ${testFiles.length} unit test files across ${shards.length} shard(s). Waiting for the Jest slot.`
  );
} catch (error) {
  clearInterval(progressTimer);
  testRun.status = 'failed';
  testRun.phase = 'failed';
  testRun.failureReason = error instanceof Error ? error.message : String(error);
  testRun.finishedAt = new Date().toISOString();
  writeTestRun();
  throw error;
}

let release = () => {};
try {
  release = await acquireSlot();
  testRun.phase = 'running coverage shards';
  writeTestRun();
  logProgress('Jest slot acquired; coverage shard execution started.');
  for (const [index, shard] of shards.entries()) {
    const shardDir = path.join(shardRoot, String(index));
    fs.mkdirSync(shardDir, { recursive: true });
    testRun.currentShard = { index: index + 1, total: shards.length, testFiles: shard.length };
    testRun.phase = 'running coverage shard';
    writeTestRun();
    logProgress(
      `Starting coverage shard ${index + 1}/${shards.length} (${shard.length} test files).`
    );
    let shardResult;
    try {
      shardResult = await runShard(shard, shardDir);
    } catch (error) {
      addTestCounts(error.testResults);
      throw error;
    }
    addTestCounts(shardResult);
    testRun.completedShards += 1;
    testRun.currentShard = null;
    writeTestRun();
    logProgress(
      `Completed coverage shard ${index + 1}/${shards.length}; ${testRun.completedShards}/${shards.length} finished.`
    );
    const fragment = JSON.parse(
      fs.readFileSync(path.join(shardDir, 'coverage-final.json'), 'utf8')
    );
    mergeCoverageFragment(fragment, storeRoot, sourceKeys);
  }

  const knownFiles = Object.fromEntries(
    fs.readdirSync(storeRoot).map(file => [decodeURIComponent(file), true])
  );
  addUncoveredFiles(sourceFiles, knownFiles, storeRoot);
  testRun.phase = 'merging coverage artifacts';
  writeTestRun();
  logProgress('All test shards passed; merging coverage artifacts.');
  writeCoverageArtifacts(
    storeRoot,
    sourceFiles,
    coverageFinalPath,
    coverageSummaryPath
  );
  enforceCoverageThreshold();
  testRun.status = 'passed';
  testRun.phase = 'passed';
  testRun.coverageAvailable = true;
  testRun.finishedAt = new Date().toISOString();
  writeTestRun();
} catch (error) {
  testRun.status = 'failed';
  testRun.phase = 'failed';
  testRun.currentShard = null;
  testRun.coverageAvailable = fs.existsSync(coverageSummaryPath);
  testRun.failureReason = error instanceof Error ? error.message : String(error);
  testRun.finishedAt = new Date().toISOString();
  writeTestRun();
  throw error;
} finally {
  clearInterval(progressTimer);
  release();
  logProgress(`Coverage run ${testRun.status} after ${testRun.completedShards}/${testRun.totalShards ?? 0} shard(s).`);
  if (testRun.status === 'passed')
    fs.rmSync(coverageRoot, { recursive: true, force: true });
}

function writeTestRun() {
  testRun.lastProgressAt = new Date().toISOString();
  fs.writeFileSync(testRunMetadataPath, `${JSON.stringify(testRun, null, 2)}\n`);
}

function writeProgress() {
  testRun.lastProgressAt = new Date().toISOString();
  writeTestRun();
  const current = testRun.currentShard
    ? `; shard ${testRun.currentShard.index}/${testRun.currentShard.total} is active`
    : '';
  process.stderr.write(
    `[check-progress] Coverage ${testRun.phase}; ${testRun.completedShards}/${testRun.totalShards ?? '?'} shard(s) complete${current}.\n`
  );
}

function logProgress(message) {
  process.stderr.write(`[check-progress] ${message}\n`);
}

function resolveProgressIntervalMs(value) {
  const intervalMs = Number.parseInt(value ?? '3000', 10);
  return Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 3000;
}

function addTestCounts(results) {
  if (!results) return;
  for (const [target, source] of [
    ['testSuites', 'numTotalTestSuites'],
    ['tests', 'numTotalTests'],
    ['passed', 'numPassedTests'],
    ['failed', 'numFailedTests'],
  ]) {
    const value = results[source];
    if (Number.isFinite(value)) testRun[target] = (testRun[target] ?? 0) + value;
  }
}

function getCommitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
}

async function acquireSlot() {
  return acquireJestSlot({ command: 'jest coverage workload' });
}

function listTestFiles() {
  const output = execFileSync(
    process.execPath,
    [JEST_BIN, '--listTests', '--json', '--watchman=false'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, DADETO_COVERAGE_SHARD: '1' },
    }
  );
  return JSON.parse(output).sort();
}

function requestedTestFiles() {
  const markerIndex = process.argv.indexOf('--runTestsByPath');
  if (markerIndex < 0) {
    return null;
  }
  return process.argv
    .slice(markerIndex + 1)
    .filter(argument => !argument.startsWith('--'))
    .map(file => path.resolve(ROOT, file))
    .sort();
}

function listSourceFiles() {
  const files = [];
  for (const sourceRoot of LOGIC_SOURCE_ROOTS) {
    const directory = path.join(ROOT, sourceRoot);
    if (sourceRoot === 'src/core' || fs.statSync(directory, { throwIfNoEntry: false })) {
      walk(directory, files);
    }
  }
  return files
    .filter(file => file.endsWith('.js'))
    .filter(file => !isIgnoredCoverageFile(file))
    .sort();
}

function walk(directory, files) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(target, files);
    } else {
      files.push(target);
    }
  }
}

function isIgnoredCoverageFile(file) {
  const relative = path.relative(ROOT, file);
  return relative.includes(`${path.sep}node_modules${path.sep}`);
}

function runShard(testFilesForShard, shardDir) {
  const testResultPath = path.join(shardDir, 'test-results.json');
  const args = [
    JEST_BIN,
    '--coverage',
    '--watchman=false',
    '--maxWorkers=1',
    '--forceExit',
    '--coverageReporters=json',
    '--coverageThreshold={"global":{"branches":0,"functions":0,"lines":0,"statements":0}}',
    '--coverageDirectory',
    shardDir,
    '--json',
    '--outputFile',
    testResultPath,
    '--runTestsByPath',
    ...testFilesForShard,
  ];
  const workerNodeOptions = `${process.env.NODE_OPTIONS ?? ''}`
    .replace(/--max-old-space-size=\d+/g, '')
    .trim();
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    stdio: ['ignore', 'inherit', 'pipe'],
    env: {
      ...process.env,
      DADETO_COVERAGE_SHARD: '1',
      NODE_OPTIONS:
        `${workerNodeOptions} --max-old-space-size=${workerHeapMb} --experimental-vm-modules`.trim(),
    },
  });
  return new Promise((resolve, reject) => {
    let stderrTail = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => {
      stderrTail = `${stderrTail}${chunk}`.slice(-8_000);
      process.stderr.write(chunk);
    });
    child.on('error', reject);
    child.on('exit', code => {
      const testResults = readTestResults(testResultPath);
      if (code === 0) {
        resolve(testResults);
        return;
      }
      const reason = /heap out of memory|heap limit|allocation failed/i.test(stderrTail)
        ? 'Coverage shard exhausted the JavaScript heap.'
        : `Unit test shard failed with exit code ${code}.`;
      const error = new Error(reason);
      error.testResults = testResults;
      reject(error);
    });
  });
}

function readTestResults(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function enforceCoverageThreshold() {
  const summary = JSON.parse(
    fs.readFileSync(coverageSummaryPath, 'utf8')
  ).total;
  for (const key of ['branches', 'functions', 'lines', 'statements']) {
    if (summary[key].pct !== 100) {
      const branchDetails =
        key === 'branches' ? readUncoveredBranchDetails() : '';
      throw new Error(
        `Coverage threshold failed for ${key}: ${summary[key].pct}%${branchDetails}`
      );
    }
  }
}

function readUncoveredBranchDetails() {
  const coverage = JSON.parse(fs.readFileSync(coverageFinalPath, 'utf8'));
  const uncovered = listUncoveredBranches(coverage);
  if (uncovered.length === 0) return '';
  const displayed = uncovered.slice(0, 100).map(branch => {
    const location = branch.line === null ? 'unknown' : `${branch.line}:${branch.column ?? 0}`;
    return `- ${branch.file}:${location} branch ${branch.branch} arm ${branch.arm}`;
  });
  const omitted = uncovered.length - displayed.length;
  if (omitted > 0) displayed.push(`- ... ${omitted} additional uncovered branch arm(s)`);
  return `\nUncovered branch arms (${uncovered.length}):\n${displayed.join('\n')}`;
}
