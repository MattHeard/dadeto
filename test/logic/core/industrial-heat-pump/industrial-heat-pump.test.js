import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { calculateIndustrialHeatPumpReadiness } from '../../../../src/browser/industrialHeatPumpReadiness.js';
import { calculateIndustrialHeatPumpValues } from '../../../../src/logic/core/industrial-heat-pump/values.js';
import { calculateTrustedIndustrialHeatPump } from '../../../../src/logic/core/industrial-heat-pump/industrial-heat-pump.js';
import {
  INDUSTRIAL_HEAT_PUMP_SCENARIOS,
  HEAT_PUMP_FIELD_NAMES,
  createIndustrialHeatPumpScenarioExport,
} from '../../../../src/logic/core/industrial-heat-pump/scenarios.js';
import { INDUSTRIAL_HEAT_PUMP_FIXTURE } from '../../../fixtures/industrialHeatPumpReadiness.js';
import {
  heatPumpCalculationCases,
  heatPumpExportCases,
  observeHeatPump,
  encodeHeatPumpExport,
} from '../../../fixtures/typed-logic/heat-pump-contract.js';
import { serializeCoverageSemantics } from '../../../fixtures/typed-logic/coverage-semantics.js';

const baseline = JSON.parse(
  readFileSync(
    new URL(
      '../../../fixtures/typed-logic/heat-pump-legacy-contracts.json',
      import.meta.url
    ),
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
const cases = [
  ...heatPumpCalculationCases(),
  ...baseline.calculations
    .filter(entry => entry.name.startsWith('preset-'))
    .map(entry => ({
      name: entry.name,
      preset: entry.name.slice('preset-'.length),
    })),
];

test.each(cases)(
  'matches the independently pinned original calculation: $name',
  ({ name, input, preset }) => {
    const candidate = preset
      ? INDUSTRIAL_HEAT_PUMP_SCENARIOS[preset].inputs
      : input;
    expect(
      fingerprint(
        observeHeatPump(calculateIndustrialHeatPumpReadiness, candidate)
      )
    ).toBe(calculations.get(name));
  }
);

test.each(heatPumpExportCases())(
  'retains the original portable export and aliases: $name',
  ({ name, input }) => {
    const observed = observeHeatPump(
      createIndustrialHeatPumpScenarioExport,
      input
    );
    if (observed.kind === 'return') {
      expect(observed.value.scenarioName).toBe(input?.scenarioName);
      expect(observed.value.assumptions).toBe(input?.assumptions);
      expect(observed.value.result).toBe(input?.result);
      expect(Object.hasOwn(observed.value, 'industryGraphReferences')).toBe(
        Boolean(input?.industryGraphReferences)
      );
      if (input?.industryGraphReferences)
        expect(observed.value.industryGraphReferences).toBe(
          input.industryGraphReferences
        );
    }
    expect(fingerprint(encodeHeatPumpExport(observed, name))).toBe(
      exports.get(name)
    );
  }
);

test('retains frozen illustrative presets and exact preset content', () => {
  expect(Object.isFrozen(INDUSTRIAL_HEAT_PUMP_SCENARIOS)).toBe(true);
  for (const scenario of Object.values(INDUSTRIAL_HEAT_PUMP_SCENARIOS)) {
    expect(Object.isFrozen(scenario)).toBe(true);
    expect(Object.isFrozen(scenario.inputs)).toBe(true);
  }
  expect(fingerprint(INDUSTRIAL_HEAT_PUMP_SCENARIOS)).toBe(
    baseline.receipt.presetSha256
  );
});

test('keeps hidden nonfinite arithmetic when its public domain state omits it', () => {
  const zero = {
    ...INDUSTRIAL_HEAT_PUMP_FIXTURE,
    installedCost: 0,
    incumbentFuelPricePerKwh: 0,
    electricityPricePerKwh: 0,
    annualMaintenanceCost: 0,
  };
  expect(calculateIndustrialHeatPumpValues(zero).simplePaybackYears).toBeNaN();
  expect(calculateTrustedIndustrialHeatPump(zero)).toMatchObject({
    valid: true,
    comparison: { simplePayback: { status: 'not-applicable' } },
  });
  const tiny = {
    ...INDUSTRIAL_HEAT_PUMP_FIXTURE,
    targetPaybackYears: Number.MIN_VALUE,
  };
  expect(calculateIndustrialHeatPumpValues(tiny).allowedElectricityCost).toBe(
    -Infinity
  );
  expect(calculateTrustedIndustrialHeatPump(tiny).valid).toBe(true);
});

test('publishes the original field ordering without projecting a preset during import', () => {
  expect(HEAT_PUMP_FIELD_NAMES).toEqual(
    Object.keys(INDUSTRIAL_HEAT_PUMP_FIXTURE)
  );
});

test.each([
  [40, 'within-limit'],
  [39.999, 'insufficient-site-capacity'],
  [40.001, 'within-limit'],
])(
  'includes exact electrical capacity at the hand-worked40kW boundary: %p',
  (availableElectricalPowerKw, status) => {
    const result = calculateTrustedIndustrialHeatPump({
      ...INDUSTRIAL_HEAT_PUMP_FIXTURE,
      availableElectricalPowerKw,
    });
    expect(result.valid).toBe(true);
    expect(result.comparison.requiredElectricalPowerKw).toBe(40);
    expect(result.comparison.feasibility.electricalPower.status).toBe(status);
  }
);
