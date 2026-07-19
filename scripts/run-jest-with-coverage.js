#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { acquireJestSlot } from './jest-pool.js';
import {
  addUncoveredFiles,
  mergeCoverageFragment,
  partitionValues,
  writeCoverageArtifacts,
} from './coverage-shards.js';

const ROOT = process.cwd();
const JEST_BIN = path.resolve(ROOT, 'node_modules/.bin/jest');
const shardSize = Number.parseInt(process.env.DADETO_COVERAGE_SHARD_SIZE ?? '24', 10);
const coverageRoot = process.env.DADETO_COVERAGE_DIR ?? path.join(os.tmpdir(), `dadeto-coverage-${process.pid}`);
const shardRoot = path.join(coverageRoot, 'shards');
const storeRoot = path.join(coverageRoot, 'files');
const finalDir = path.resolve(ROOT, 'reports/coverage');

const testFiles = requestedTestFiles() ?? listTestFiles();
const sourceFiles = listSourceFiles();
const sourceKeys = sourceFiles;
const shards = partitionValues(testFiles, shardSize);

fs.rmSync(coverageRoot, { recursive: true, force: true });
fs.mkdirSync(shardRoot, { recursive: true });
fs.mkdirSync(storeRoot, { recursive: true });

const release = await acquireSlot();
try {
  for (const [index, shard] of shards.entries()) {
    const shardDir = path.join(shardRoot, String(index));
    fs.mkdirSync(shardDir, { recursive: true });
    await runShard(shard, shardDir);
    const fragment = JSON.parse(fs.readFileSync(path.join(shardDir, 'coverage-final.json'), 'utf8'));
    mergeCoverageFragment(fragment, storeRoot, sourceKeys);
  }

  const knownFiles = Object.fromEntries(
    fs.readdirSync(storeRoot).map(file => [decodeURIComponent(file), true])
  );
  addUncoveredFiles(sourceFiles, knownFiles, storeRoot);
  fs.mkdirSync(finalDir, { recursive: true });
  writeCoverageArtifacts(
    storeRoot,
    sourceFiles,
    path.join(finalDir, 'coverage-final.json'),
    path.join(finalDir, 'coverage-summary.json')
  );
  enforceCoverageThreshold();
} finally {
  release();
  fs.rmSync(coverageRoot, { recursive: true, force: true });
}

async function acquireSlot() {
  return acquireJestSlot({ command: 'jest coverage workload' });
}

function listTestFiles() {
  const output = execFileSync(process.execPath, [JEST_BIN, '--listTests', '--json', '--watchman=false'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, DADETO_COVERAGE_SHARD: '1' },
  });
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
  walk(path.join(ROOT, 'src/core'), files);
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
  const relative = path.relative(ROOT, file).replaceAll(path.sep, '/');
  return [
    'src/core/browser/document.js', 'src/core/browser/main.js', 'src/core/browser/moderate.js',
    'src/core/browser/presenters/realtimeVoicePrototype.js', 'src/core/browser/toys.js',
    'src/core/browser/jsonUtils.js', 'src/core/build/full-width.js', 'src/core/build/generator.js',
    'src/core/build/head.js', 'src/core/build/navbar.js', 'src/core/build/styles.js',
    'src/core/build/title.js', 'src/core/build/copy-cloud.js', 'src/core/fs.js',
    'src/core/local/symphony/launch.js', 'src/core/local/symphony/tuiRenderer.js',
    'src/core/browser/jsonValueHelpers.js', 'src/core/cloud/firestore-helpers.js',
    'src/core/generate-stats-core.js', 'src/core/get-api-key-credit-v2.js',
    'src/core/process-new-page-core.js', 'src/core/process-new-story-core.js',
    'src/core/render-contents-core.js', 'src/core/render-variant-core.js',
    'src/core/submit-new-page-core.js', 'src/core/submit-new-story-core.js',
    'src/core/submit-shared.js', 'src/core/scripts/check-core-parse.js',
    'src/core/scripts/check-overexposed-exports.js', 'src/core/scripts/coverage-shards.js',
    'src/core/local/gcp-simulator/server.js',
  ].includes(relative) || /\/common-core\.js$|\/admin-config\.js$|\/helpers\.js$/.test(relative)
    || /src\/core\/cloud\/(assign-moderation-job|generate-stats|payment-webhook)\//.test(relative)
    || relative === 'src/core/cloud/get-moderation-variant/cors.js';
}

function runShard(testFilesForShard, shardDir) {
  const args = [JEST_BIN, '--coverage', '--watchman=false', '--maxWorkers=1',
    '--coverageReporters=json',
    '--coverageThreshold={"global":{"branches":0,"functions":0,"lines":0,"statements":0}}',
    '--coverageDirectory', shardDir, '--runTestsByPath', ...testFilesForShard];
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, DADETO_COVERAGE_SHARD: '1', NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --experimental-vm-modules`.trim() },
  });
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Coverage shard failed with code ${code}`)));
  });
}

function enforceCoverageThreshold() {
  const summary = JSON.parse(fs.readFileSync(path.join(finalDir, 'coverage-summary.json'), 'utf8')).total;
  for (const key of ['branches', 'functions', 'lines', 'statements']) {
    if (summary[key].pct !== 100) {
      throw new Error(`Coverage threshold failed for ${key}: ${summary[key].pct}%`);
    }
  }
}
