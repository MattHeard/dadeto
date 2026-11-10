import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { setImmediate as yieldEventLoop } from 'node:timers/promises';
import { parse } from '@babel/parser';
import {
  heatPumpPresenterCases,
  heatPumpPresenterFormatCases,
} from './heat-pump-presenter-cases.js';
import { observeHeatPumpPresenter } from './heat-pump-presenter-driver.js';
import { serializeCoverageSemantics } from './coverage-semantics.js';

const baseline = '6d2a626b2acfde2719ff5b4dd43966a6ccdd86fa';
const root = new URL('../../../', import.meta.url);
const entry = 'src/browser/industrialHeatPump/page.js';
const page = 'src/content/pages/industrial-heat-pump-readiness/index.html';
const formatControls = process.argv.includes('--format-controls');
const evidenceFile = new URL(
  formatControls
    ? './heat-pump-presenter-format-legacy-contracts.json'
    : './heat-pump-presenter-legacy-contracts.json',
  import.meta.url
);
const fingerprint = value =>
  createHash('sha256').update(serializeCoverageSemantics(value)).digest('hex');
const sourceHashes = {};

/**
 * Read actual immutable original source rather than a copied implementation.
 * @param {string} file Repository path.
 * @returns {string} Original bytes.
 */
function originalSource(file) {
  const git = spawnSync('git', ['show', `${baseline}:${file}`], {
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);
  const source = git.stdout;
  sourceHashes[file] = createHash('sha256').update(source).digest('hex');
  return source;
}

/**
 * Load the real relative module graph through native ESM imports.
 * @param {boolean} original Whether to read immutable Git source.
 * @returns {Promise<object>} Actual entry exports.
 */
async function loadGraph(original) {
  const urls = new Map();
  const urlFor = async file => {
    if (!urls.has(file))
      urls.set(
        file,
        (async () => {
          let source = original
            ? originalSource(file)
            : readFileSync(new URL(file, root), 'utf8');
          const imports = parse(source, { sourceType: 'module' })
            .program.body.filter(node => node.source)
            .map(node => node.source)
            .toSorted((a, b) => b.start - a.start);
          for (const specifier of imports) {
            assert.ok(
              specifier.value.startsWith('.'),
              `Unexpected external module: ${specifier.value}`
            );
            const target = path.posix.normalize(
              path.posix.join(path.posix.dirname(file), specifier.value)
            );
            source =
              source.slice(0, specifier.start) +
              JSON.stringify(await urlFor(target)) +
              source.slice(specifier.end);
          }
          return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
        })()
      );
    return urls.get(file);
  };
  return import(await urlFor(entry));
}
const original = await loadGraph(true);
const current = await loadGraph(false);
const originalPage = originalSource(page);
const currentPage = readFileSync(new URL(page, root), 'utf8');
assert.equal(currentPage, originalPage);
const name = 'startIndustrialHeatPumpReadinessPage';
assert.equal(current[name].name, original[name].name);
assert.equal(current[name].length, original[name].length);
const observations = [];
let snapshotCount = 0;
for (const scenario of formatControls
  ? heatPumpPresenterFormatCases()
  : heatPumpPresenterCases()) {
  const expected = observeHeatPumpPresenter(
    original[name],
    originalPage,
    scenario
  );
  const actual = observeHeatPumpPresenter(current[name], currentPage, scenario);
  assert.deepEqual(actual, expected, scenario.name);
  if (scenario.name === 'format-trace')
    assert.equal(expected[0].formats.length, 19);
  const expectedFingerprints = expected.map(state => ({
    step: state.step,
    sha256: fingerprint(state),
  }));
  assert.deepEqual(
    actual.map(state => ({ step: state.step, sha256: fingerprint(state) })),
    expectedFingerprints,
    scenario.name
  );
  observations.push({ name: scenario.name, snapshots: expectedFingerprints });
  snapshotCount += expected.length;
  // jsdom/WeakRef lifetime extends through the current event-loop turn. Release
  // closed windows between cases instead of accumulating them in one long tick.
  await yieldEventLoop();
}
const receipt = {
  ...(formatControls ? { controlKind: 'format-effects' } : {}),
  baseline,
  sourceFiles: Object.keys(sourceHashes).length,
  sourceGraphSha256: fingerprint(sourceHashes),
  cases: observations.length,
  snapshots: snapshotCount,
  outcomesSha256: fingerprint(observations),
};
const evidence = { receipt, sourceHashes, observations };
if (existsSync(evidenceFile))
  assert.deepEqual(evidence, JSON.parse(readFileSync(evidenceFile, 'utf8')));
if (process.argv.includes('--write-legacy'))
  writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
