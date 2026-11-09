import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { INDUSTRIAL_HEAT_PUMP_FIXTURE } from '../industrialHeatPumpReadiness.js';
import { serializeCoverageSemantics as serialize } from './coverage-semantics.js';
import {
  heatPumpCalculationCases,
  heatPumpExportCases,
  observeHeatPump,
  encodeHeatPumpExport,
} from './heat-pump-contract.js';

const baseline = '2cc92b7de42169220d53cc453f8f87657c5c6d91';
const sourceHashes = {
  'src/browser/industrialHeatPumpReadiness.js':
    'f627fd5782886a9a59e396088c71c2b02049919b66e9558094a375a334dab227',
  'src/core/industrialHeatPumpReadiness.js':
    'f0c60a5b5b4b18584f1ecdebb452e72454ca27f9cd4c84ec6383f9782b91e727',
  'src/browser/industrialHeatPump/validation.js':
    '8c8efacd811f298a3d014ff7d366e2509371eade0b8ff79942af2b7b1aa39efb',
  'src/browser/industrialHeatPump/comparison.js':
    '002352ec10c217d32ac4a67b3be74ec32fad3cfcf7f7b84043ed790f306d301f',
  'src/browser/industrialHeatPump/thresholds.js':
    '74982e1e6c78144c63d348c8e8f609aef4b105fd1cd65bc08998a5ee0bbae1a8',
  'src/browser/industrialHeatPump/feasibility.js':
    '538e6f70eb08da5fea9e9b7c34d6530f921759242adcb4c95416fa615e99d59c',
  'src/core/browser/industrialHeatPump/scenarios.js':
    'ec03f4859b873bddcb5829ac5ccfbe96e5d9e2755279b6c62332aceba4ec038d',
};
const root = new URL('../../../', import.meta.url);
const calculatorPath = 'src/browser/industrialHeatPumpReadiness.js';
const scenarioPath = 'src/core/browser/industrialHeatPump/scenarios.js';
const currentScenarioPath = scenarioPath;

/**
 * Load actual native module graphs without copied computation bodies.
 * @param {boolean} original Whether source comes from the immutable Git commit.
 * @returns {{load: (file: string) => Promise<object>, visited: Set<string>}} Native graph observer.
 */
function graph(original) {
  const urls = new Map();
  const visited = new Set();
  const urlFor = async file => {
    if (!urls.has(file))
      urls.set(
        file,
        (async () => {
          let source;
          if (original) {
            const git = spawnSync('git', ['show', `${baseline}:${file}`], {
              encoding: 'utf8',
            });
            assert.equal(git.status, 0, git.stderr);
            source = git.stdout;
            assert.equal(
              createHash('sha256').update(source).digest('hex'),
              sourceHashes[file],
              file
            );
          } else source = readFileSync(new URL(file, root), 'utf8');
          visited.add(file);
          const imports = parse(source, { sourceType: 'module' })
            .program.body.filter(node => node.source)
            .map(node => node.source)
            .toSorted((left, right) => right.start - left.start);
          for (const specifier of imports) {
            assert.ok(
              specifier.value.startsWith('.'),
              `Unexpected external module ${specifier.value}`
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
  return { load: async file => import(await urlFor(file)), visited };
}
const originalGraph = graph(true);
const currentGraph = graph(false);
const original = await originalGraph.load(calculatorPath);
const current = await currentGraph.load(calculatorPath);
const originalScenarios = await originalGraph.load(scenarioPath);
const currentScenarios = await currentGraph.load(currentScenarioPath);
assert.deepEqual(
  [...originalGraph.visited].sort(),
  Object.keys(sourceHashes).sort()
);
const calculate = 'calculateIndustrialHeatPumpReadiness';
const exportScenario = 'createIndustrialHeatPumpScenarioExport';
for (const [oldModule, newModule, name] of [
  [original, current, calculate],
  [originalScenarios, currentScenarios, exportScenario],
]) {
  assert.equal(newModule[name].name, oldModule[name].name);
  assert.equal(newModule[name].length, oldModule[name].length);
}
const calcHash = createHash('sha256');
const calculationEvidence = [];
const exportEvidence = [];
let calcCases = 0;
for (const entry of heatPumpCalculationCases()) {
  const expected = observeHeatPump(original[calculate], entry.input);
  const actual = observeHeatPump(current[calculate], entry.input);
  assert.deepEqual(actual, expected, entry.name);
  assert.equal(serialize(actual), serialize(expected), entry.name);
  calcHash.update(`${entry.name}:${serialize(expected)}\n`);
  calculationEvidence.push({
    name: entry.name,
    sha256: createHash('sha256').update(serialize(expected)).digest('hex'),
  });
  calcCases += 1;
}
const presets = 'INDUSTRIAL_HEAT_PUMP_SCENARIOS';
for (const [name, scenario] of Object.entries(originalScenarios[presets])) {
  const expected = observeHeatPump(original[calculate], scenario.inputs);
  const actual = observeHeatPump(
    current[calculate],
    currentScenarios[presets][name].inputs
  );
  assert.deepEqual(actual, expected);
  assert.equal(serialize(actual), serialize(expected));
  calcHash.update(`preset-${name}:${serialize(expected)}\n`);
  calculationEvidence.push({
    name: `preset-${name}`,
    sha256: createHash('sha256').update(serialize(expected)).digest('hex'),
  });
  calcCases += 1;
}
const arithmetic = await originalGraph.load(
  'src/core/industrialHeatPumpReadiness.js'
);
const zeroSavings = {
  ...INDUSTRIAL_HEAT_PUMP_FIXTURE,
  incumbentFuelPricePerKwh: 0,
  electricityPricePerKwh: 0,
  annualMaintenanceCost: 0,
  installedCost: 0,
};
assert.ok(
  Number.isNaN(
    arithmetic.calculateIndustrialHeatPumpValues(zeroSavings).simplePaybackYears
  )
);
assert.equal(original[calculate](zeroSavings).valid, true);
const tinyTarget = {
  ...INDUSTRIAL_HEAT_PUMP_FIXTURE,
  targetPaybackYears: Number.MIN_VALUE,
};
assert.equal(
  arithmetic.calculateIndustrialHeatPumpValues(tinyTarget)
    .allowedElectricityCost,
  -Infinity
);
assert.equal(original[calculate](tinyTarget).valid, true);
assert.equal(
  serialize(currentScenarios[presets]),
  serialize(originalScenarios[presets])
);
for (const module of [originalScenarios, currentScenarios]) {
  assert.ok(Object.isFrozen(module[presets]));
  for (const scenario of Object.values(module[presets])) {
    assert.ok(Object.isFrozen(scenario));
    assert.ok(Object.isFrozen(scenario.inputs));
  }
}
const presetSha256 = createHash('sha256')
  .update(serialize(originalScenarios[presets]))
  .digest('hex');
const exportHash = createHash('sha256');
let exportCases = 0;
for (const entry of heatPumpExportCases()) {
  const expected = observeHeatPump(
    originalScenarios[exportScenario],
    entry.input
  );
  const actual = observeHeatPump(currentScenarios[exportScenario], entry.input);
  assert.deepEqual(actual, expected, entry.name);
  if (expected.kind === 'return') {
    for (const key of [
      'scenarioName',
      'assumptions',
      'result',
      'industryGraphReferences',
    ]) {
      assert.equal(actual.value[key], expected.value[key]);
      if (entry.input && Object.hasOwn(expected.value, key))
        assert.equal(actual.value[key], entry.input[key]);
    }
  }
  const encoded = serialize(encodeHeatPumpExport(expected, entry.name));
  assert.equal(serialize(encodeHeatPumpExport(actual, entry.name)), encoded);
  exportHash.update(`${entry.name}:${encoded}\n`);
  exportEvidence.push({
    name: entry.name,
    sha256: createHash('sha256').update(encoded).digest('hex'),
  });
  exportCases += 1;
}
let getterErrorCases = 0;
const failures = [
  undefined,
  null,
  false,
  0,
  'failure',
  Symbol('failure'),
  {},
  new Error('original'),
];
for (const failure of failures) {
  for (const field of Object.keys(INDUSTRIAL_HEAT_PUMP_FIXTURE)) {
    const read = implementation => {
      const input = { ...INDUSTRIAL_HEAT_PUMP_FIXTURE };
      let reads = 0;
      Object.defineProperty(input, field, {
        get() {
          reads += 1;
          throw failure;
        },
      });
      let thrown = false;
      try {
        implementation[calculate](input);
      } catch (actual) {
        thrown = true;
        assert.equal(actual, failure);
      }
      assert.ok(thrown);
      return reads;
    };
    assert.equal(read(current), read(original));
    getterErrorCases += 1;
  }
}
const traceReads = implementation => {
  const trace = [];
  const input = {};
  for (const [field, value] of Object.entries(INDUSTRIAL_HEAT_PUMP_FIXTURE))
    Object.defineProperty(input, field, {
      get() {
        trace.push(field);
        return value;
      },
    });
  const result = implementation[calculate](input);
  return { trace, result };
};
const originalTrace = traceReads(original);
assert.equal(serialize(traceReads(current)), serialize(originalTrace));
let exportErrorCases = 0;
for (const failure of failures) {
  for (const field of [
    'scenarioName',
    'assumptions',
    'result',
    'industryGraphReferences',
  ]) {
    const read = implementation => {
      const input = {
        scenarioName: 'Example',
        assumptions: {},
        result: {},
        industryGraphReferences: { sector: 's' },
      };
      let reads = 0;
      Object.defineProperty(input, field, {
        get() {
          reads += 1;
          throw failure;
        },
      });
      let thrown = false;
      try {
        implementation[exportScenario](input);
      } catch (actual) {
        thrown = true;
        assert.equal(actual, failure);
      }
      assert.ok(thrown);
      return reads;
    };
    assert.equal(read(currentScenarios), read(originalScenarios));
    exportErrorCases += 1;
  }
}
const receipt = {
  baseline,
  sourceGraphSha256: createHash('sha256')
    .update(JSON.stringify(sourceHashes))
    .digest('hex'),
  calcCases,
  calcSha256: calcHash.digest('hex'),
  getterErrorCases,
  readTraceSha256: createHash('sha256')
    .update(serialize(originalTrace))
    .digest('hex'),
  presetSha256,
  exportCases,
  exportSha256: exportHash.digest('hex'),
  exportErrorCases,
};
const expectedReceipt = {
  baseline: '2cc92b7de42169220d53cc453f8f87657c5c6d91',
  sourceGraphSha256:
    '347098f878c945b09329c70dd36c35c79268ac2decfaef20dc460e658aa32459',
  calcCases: 613,
  calcSha256:
    'a0f7508f128b2a83d99c0870e144dc386d328ef1cc6427f504377882e837ce73',
  getterErrorCases: 96,
  readTraceSha256:
    'c7d7c976b9c01b4733f5d8668e96b01d6571be842888f02b400c893cd9337c74',
  presetSha256:
    '719dd719afcf532238897782940d1ce8a2befe654825d0d3ceb986d51ae86395',
  exportCases: 19,
  exportSha256:
    'e30cd1997b3aa5e12fdaa8e289335f785b702b79045f43a1c3b9719aed12c686',
  exportErrorCases: 32,
};
assert.deepEqual(receipt, expectedReceipt);
if (process.argv.includes('--write-legacy')) {
  writeFileSync(
    new URL('./heat-pump-legacy-contracts.json', import.meta.url),
    `${JSON.stringify({ receipt, sourceHashes, calculations: calculationEvidence, exports: exportEvidence }, null, 2)}\n`
  );
}
console.log(JSON.stringify(receipt, null, 2));
