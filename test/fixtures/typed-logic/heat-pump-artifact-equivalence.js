import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from '@babel/parser';
import {
  heatPumpCalculationCases,
  heatPumpExportCases,
  observeHeatPump,
  encodeHeatPumpExport,
} from './heat-pump-contract.js';
import { serializeCoverageSemantics } from './coverage-semantics.js';

const baseline = JSON.parse(
  readFileSync(
    new URL('./heat-pump-legacy-contracts.json', import.meta.url),
    'utf8'
  )
);
const calculations = new Map(
  baseline.calculations.map(entry => [entry.name, entry.sha256])
);
const exports = new Map(
  baseline.exports.map(entry => [entry.name, entry.sha256])
);
const fingerprint = value =>
  createHash('sha256').update(serializeCoverageSemantics(value)).digest('hex');
const entries = [
  'browser/industrialHeatPump/page.js',
  'browser/industrialHeatPumpReadiness.js',
  'browser/industrialHeatPump/scenarios.js',
  'browser/industrialHeatPump/validation.js',
  'browser/industrialHeatPump/comparison.js',
  'browser/industrialHeatPump/feasibility.js',
  'browser/industrialHeatPump/thresholds.js',
  'core/industrialHeatPumpReadiness.js',
  'core/browser/industrialHeatPump/scenarios.js',
];

/**
 * Resolve every static dependency of actual published entry and compatibility URLs.
 * @param {string} artifactRoot Built artifact root.
 * @returns {string[]} Exact checked relative module paths.
 */
function inspectClosure(artifactRoot) {
  const visited = new Set();
  const pending = entries.map(entry => path.join(artifactRoot, entry));
  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    assert.ok(
      file.startsWith(`${artifactRoot}${path.sep}`),
      `Escaped artifact: ${file}`
    );
    const source = readFileSync(file, 'utf8');
    visited.add(file);
    for (const node of parse(source, { sourceType: 'module' }).program.body) {
      if (!node.source) continue;
      assert.ok(
        node.source.value.startsWith('.'),
        `Unexpected external import: ${node.source.value}`
      );
      pending.push(path.resolve(path.dirname(file), node.source.value));
    }
  }
  return [...visited].map(file => path.relative(artifactRoot, file)).sort();
}

const candidates = process.argv.slice(2);
assert.ok(
  candidates.length,
  'Provide at least one actual built artifact root.'
);
for (const candidate of candidates) {
  const artifactRoot = path.resolve(candidate);
  const modules = inspectClosure(artifactRoot);
  const load = entry =>
    import(pathToFileURL(path.join(artifactRoot, entry)).href);
  const calculator = (await load('browser/industrialHeatPumpReadiness.js'))
    .calculateIndustrialHeatPumpReadiness;
  const scenarios = await load('logic/core/industrial-heat-pump/scenarios.js');
  for (const entry of [
    'core/browser/industrialHeatPump/scenarios.js',
    'browser/industrialHeatPump/scenarios.js',
  ]) {
    const compatibility = await load(entry);
    assert.equal(
      compatibility.createIndustrialHeatPumpScenarioExport,
      scenarios.createIndustrialHeatPumpScenarioExport
    );
    assert.equal(
      compatibility.INDUSTRIAL_HEAT_PUMP_SCENARIOS,
      scenarios.INDUSTRIAL_HEAT_PUMP_SCENARIOS
    );
  }
  const values = await load('logic/core/industrial-heat-pump/values.js');
  assert.equal(
    (await load('core/industrialHeatPumpReadiness.js'))
      .calculateIndustrialHeatPumpValues,
    values.calculateIndustrialHeatPumpValues
  );
  for (const [file, name] of [
    ['comparison', 'buildIndustrialHeatPumpComparison'],
    ['feasibility', 'buildIndustrialHeatPumpFeasibility'],
    ['thresholds', 'buildIndustrialHeatPumpThresholds'],
  ]) {
    assert.equal(
      (await load(`browser/industrialHeatPump/${file}.js`))[name],
      (await load(`logic/core/industrial-heat-pump/${file}.js`))[name]
    );
  }
  let calculationCount = 0;
  for (const { name, input } of [
    ...heatPumpCalculationCases(),
    ...Object.entries(scenarios.INDUSTRIAL_HEAT_PUMP_SCENARIOS).map(
      ([name, scenario]) => ({ name: `preset-${name}`, input: scenario.inputs })
    ),
  ]) {
    assert.equal(
      fingerprint(observeHeatPump(calculator, input)),
      calculations.get(name),
      `${candidate}: ${name}`
    );
    calculationCount += 1;
  }
  const validate = (await load('browser/industrialHeatPump/validation.js'))
    .validateIndustrialHeatPumpInput;
  assert.deepEqual(
    validate(scenarios.INDUSTRIAL_HEAT_PUMP_SCENARIOS.base.inputs),
    []
  );
  assert.deepEqual(validate(null), [
    { field: 'input', code: 'object-required' },
  ]);
  assert.deepEqual(
    validate({}),
    Object.keys(scenarios.INDUSTRIAL_HEAT_PUMP_SCENARIOS.base.inputs).map(
      field => ({ field, code: 'required' })
    )
  );
  const failure = Symbol('original validation failure');
  const throwing = { ...scenarios.INDUSTRIAL_HEAT_PUMP_SCENARIOS.base.inputs };
  Object.defineProperty(throwing, 'heatPumpCop', {
    get: () => {
      throw failure;
    },
  });
  assert.throws(
    () => validate(throwing),
    error => error === failure
  );
  for (const { name, input } of heatPumpExportCases()) {
    const observed = observeHeatPump(
      scenarios.createIndustrialHeatPumpScenarioExport,
      input
    );
    if (observed.kind === 'return') {
      assert.equal(observed.value.assumptions, input?.assumptions);
      assert.equal(observed.value.result, input?.result);
    }
    assert.equal(
      fingerprint(encodeHeatPumpExport(observed, name)),
      exports.get(name)
    );
  }
  console.log(
    JSON.stringify({
      artifact: candidate,
      modules: modules.length,
      closureSha256: fingerprint(modules),
      calculations: calculationCount,
      exports: baseline.exports.length,
      compatibilityEntries: entries.length,
    })
  );
}
