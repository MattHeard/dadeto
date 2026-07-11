import fs from 'node:fs';
import path from 'node:path';
import { createInstrumenter } from 'istanbul-lib-instrument';
import istanbulCoverage from 'istanbul-lib-coverage';

const { createFileCoverage } = istanbulCoverage;

const COVERAGE_KEYS = ['lines', 'statements', 'functions', 'branches'];

/**
 * Split an ordered list into bounded chunks.
 * @param {string[]} values Values to split.
 * @param {number} size Maximum chunk size.
 * @returns {string[][]} Chunks.
 */
export function partitionValues(values, size) {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error('Coverage shard size must be a positive integer.');
  }

  const shards = [];
  for (let index = 0; index < values.length; index += size) {
    shards.push(values.slice(index, index + size));
  }
  return shards;
}

/**
 * Merge one coverage fragment into a file-backed coverage store.
 * @param {Record<string, unknown>} fragment Coverage fragment.
 * @param {string} storeDir Store directory.
 * @param {string[] | undefined} allowedFiles Coverage paths to retain.
 * @param {{ readFileSync: typeof fs.readFileSync, writeFileSync: typeof fs.writeFileSync, mkdirSync: typeof fs.mkdirSync }} io Filesystem dependency.
 */
export function mergeCoverageFragment(fragment, storeDir, allowedFiles, io = fs) {
  io.mkdirSync(storeDir, { recursive: true });
  for (const [filePath, incoming] of Object.entries(fragment)) {
    if (allowedFiles && !allowedFiles.includes(filePath)) {
      continue;
    }
    const storePath = path.join(storeDir, encodeURIComponent(filePath));
    let merged = incoming;
    if (fs.existsSync(storePath)) {
      const existing = JSON.parse(io.readFileSync(storePath, 'utf8'));
      const coverage = createFileCoverage(existing);
      coverage.merge(incoming);
      merged = coverage.toJSON();
    }
    io.writeFileSync(storePath, `${JSON.stringify(merged)}\n`);
  }
}

/**
 * Add zero counters for source files absent from the test fragments.
 * @param {string[]} sourceFiles Source files to inventory.
 * @param {Record<string, unknown>} knownFiles Files already represented.
 * @param {string} storeDir Store directory.
 * @param {{ readFileSync: typeof fs.readFileSync, writeFileSync: typeof fs.writeFileSync, mkdirSync: typeof fs.mkdirSync }} io Filesystem dependency.
 */
export function addUncoveredFiles(sourceFiles, knownFiles, storeDir, io = fs) {
  io.mkdirSync(storeDir, { recursive: true });
  const instrumenter = createInstrumenter({ esModules: true });
  for (const filePath of sourceFiles) {
    if (knownFiles[filePath]) {
      continue;
    }
    instrumenter.instrumentSync(io.readFileSync(filePath, 'utf8'), filePath);
    const zeroCoverage = instrumenter.lastFileCoverage();
    io.writeFileSync(
      path.join(storeDir, encodeURIComponent(filePath)),
      `${JSON.stringify(zeroCoverage)}\n`
    );
  }
}

/**
 * Build final JSON artifacts by reading one file record at a time.
 * @param {string} storeDir Store directory.
 * @param {string[]} filePaths Ordered source file paths.
 * @param {string} finalPath Final coverage map path.
 * @param {string} summaryPath Final summary path.
 * @param {{ readFileSync: typeof fs.readFileSync, writeFileSync: typeof fs.writeFileSync }} io Filesystem dependency.
 */
export function writeCoverageArtifacts(storeDir, filePaths, finalPath, summaryPath, io = fs) {
  const total = createEmptySummary();
  const finalChunks = ['{'];
  const summaryChunks = ['{\n  "total": '];
  for (const key of COVERAGE_KEYS) {
    total[key] = { total: 0, covered: 0, skipped: 0, pct: 100 };
  }

  filePaths.forEach((filePath, index) => {
    const record = JSON.parse(
      io.readFileSync(path.join(storeDir, encodeURIComponent(filePath)), 'utf8')
    );
    const summary = createFileCoverage(record).toSummary().toJSON();
    const displayPath = path.relative(process.cwd(), filePath).replaceAll(path.sep, '/');
    addSummary(total, summary);
    const prefix = index === 0 ? '' : ',';
    finalChunks.push(`${prefix}${JSON.stringify(displayPath)}:${JSON.stringify(record)}`);
    summaryChunks.push(`,\n  ${JSON.stringify(displayPath)}: ${JSON.stringify(summary)}`);
  });

  summaryChunks[1] = JSON.stringify(total);
  summaryChunks.push('\n}\n');
  finalChunks.push('}\n');
  io.writeFileSync(finalPath, finalChunks.join(''));
  io.writeFileSync(summaryPath, summaryChunks.join(''));
}

function createEmptySummary() {
  return {};
}

function addSummary(total, summary) {
  for (const key of COVERAGE_KEYS) {
    total[key].total += summary[key].total;
    total[key].covered += summary[key].covered;
    total[key].skipped += summary[key].skipped;
    total[key].pct = percentage(total[key].covered, total[key].total);
  }
}

function percentage(covered, total) {
  if (total === 0) {
    return 100;
  }
  return Math.floor((100 * 1000 * covered) / total) / 1000;
}
