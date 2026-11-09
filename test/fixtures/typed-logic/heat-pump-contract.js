import { INDUSTRIAL_HEAT_PUMP_FIXTURE } from '../industrialHeatPumpReadiness.js';

/**
 * Enumerate screening input categories and coupled economic/overflow boundaries.
 * @returns {Array<{name: string, input: unknown}>} Independent fixture inputs.
 */
export function heatPumpCalculationCases() {
  const cases = [];
  const base = INDUSTRIAL_HEAT_PUMP_FIXTURE;
  const fields = Object.keys(base);
  const candidates = [
    undefined,
    null,
    false,
    true,
    '',
    '2',
    2,
    0,
    -0,
    -1,
    Number.MIN_VALUE,
    Number.MAX_VALUE,
    NaN,
    Infinity,
    -Infinity,
    1.5,
    8760,
    8761,
    300,
    301,
    {},
    [],
    [2],
    1n,
    Symbol('field'),
    () => 2,
  ];
  for (const field of fields) {
    for (const [index, value] of candidates.entries())
      cases.push({
        name: `${field}-${index}`,
        input: { ...base, [field]: value },
      });
    const missing = { ...base };
    delete missing[field];
    cases.push({ name: `${field}-missing`, input: missing });
  }
  for (const [index, input] of [
    undefined,
    null,
    false,
    0,
    '',
    17,
    true,
    'input',
    [],
    [base],
    Symbol('root'),
    () => base,
    new Number(2),
    new Date(0),
  ].entries())
    cases.push({ name: `root-${index}`, input });
  for (const fuel of [0, 0.12, 1, Number.MAX_VALUE]) {
    for (const electricity of [0, 0.18, 1, Number.MAX_VALUE]) {
      for (const maintenance of [0, 4000, 100000, Number.MAX_VALUE]) {
        for (const cop of [0.5, 2, 10, Number.MIN_VALUE])
          cases.push({
            name: `coupled-${fuel}-${electricity}-${maintenance}-${cop}`,
            input: {
              ...base,
              incumbentFuelPricePerKwh: fuel,
              electricityPricePerKwh: electricity,
              annualMaintenanceCost: maintenance,
              heatPumpCop: cop,
            },
          });
      }
    }
  }
  for (const installedCost of [0, 150000, Number.MAX_VALUE]) {
    for (const targetPaybackYears of [Number.MIN_VALUE, 5, Number.MAX_VALUE])
      cases.push({
        name: `target-${installedCost}-${targetPaybackYears}`,
        input: { ...base, installedCost, targetPaybackYears },
      });
  }
  cases.push({
    name: 'zero-savings-hidden-nan',
    input: {
      ...base,
      incumbentFuelPricePerKwh: 0,
      electricityPricePerKwh: 0,
      annualMaintenanceCost: 0,
      installedCost: 0,
    },
  });
  cases.push({
    name: 'null-prototype',
    input: Object.assign(Object.create(null), base),
  });
  cases.push({
    name: 'date-with-fields',
    input: Object.assign(new Date(0), base),
  });
  cases.push({ name: 'array-with-fields', input: Object.assign([], base) });
  const nonEnumerable = {};
  for (const [field, value] of Object.entries(base))
    Object.defineProperty(nonEnumerable, field, { value });
  cases.push({ name: 'nonenumerable-own-fields', input: nonEnumerable });
  const inherited = { ...base };
  delete inherited.heatPumpCop;
  Object.setPrototypeOf(inherited, { heatPumpCop: base.heatPumpCop });
  cases.push({ name: 'inherited-required-field', input: inherited });
  cases.push({
    name: 'ignored-extra-fields',
    input: {
      ...base,
      ignored: Symbol('extra'),
      method() {
        throw new Error('not invoked');
      },
    },
  });
  return cases;
}

/**
 * Enumerate portable export root/metadata states with independent opaque payloads.
 * @returns {Array<{name: string, input: unknown}>} Independent export candidates.
 */
export function heatPumpExportCases() {
  const cases = [];
  for (const [index, input] of [
    undefined,
    null,
    false,
    0,
    '',
    17,
    true,
    [],
    Symbol('root'),
    () => {},
  ].entries())
    cases.push({ name: `root-${index}`, input });
  const assumptions = { ...INDUSTRIAL_HEAT_PUMP_FIXTURE };
  const result = { valid: true, comparison: { fixture: 1 } };
  for (const [index, industryGraphReferences] of [
    undefined,
    null,
    false,
    0,
    {},
    {
      sector: 'sector-1',
      process: 'process-1',
      inputs: ['in-1'],
      outputs: ['out-1'],
    },
    'opaque',
    Symbol('reference'),
    () => 'reference',
  ].entries())
    cases.push({
      name: `refs-${index}`,
      input: {
        scenarioName: 'Example',
        assumptions,
        result,
        industryGraphReferences,
      },
    });
  return cases;
}

/**
 * Retain actual public return or native failure category/message.
 * @param {Function} operation Public operation.
 * @param {unknown} input Unparsed candidate.
 * @returns {object} Observed outcome.
 */
export function observeHeatPump(operation, input) {
  try {
    return { kind: 'return', value: operation(input) };
  } catch (error) {
    return {
      kind: 'throw',
      type: typeof error,
      name: error?.name,
      message: error?.message,
    };
  }
}

/**
 * Project only opaque top-level export slots for stable fingerprints.
 * Actual alias identity is asserted separately by the native harness.
 * @param {object} outcome Observed export outcome.
 * @param {string} label Stable fixture identity.
 * @returns {object} Serializable output graph.
 */
export function encodeHeatPumpExport(outcome, label) {
  if (outcome.kind !== 'return') return outcome;
  const value = { ...outcome.value };
  for (const key of [
    'scenarioName',
    'assumptions',
    'result',
    'industryGraphReferences',
  ]) {
    if (['symbol', 'function'].includes(typeof value[key]))
      value[key] = { opaque: typeof value[key], label: `${label}-${key}` };
  }
  return { ...outcome, value };
}
