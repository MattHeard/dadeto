import { INDUSTRIAL_HEAT_PUMP_FIXTURE } from '../industrialHeatPumpReadiness.js';

/**
 * Enumerate actual UI input, status and integration states before extraction.
 * @returns {object[]} Independent page interaction descriptions.
 */
export function heatPumpPresenterCases() {
  const cases = [{ name: 'base', operations: [] }];
  for (const value of [
    'base',
    'conservative',
    'optimistic',
    'custom',
    'unknown',
    '',
    '__proto__',
    'constructor',
    'toString',
  ])
    cases.push({
      name: `preset-${value}`,
      operations: [{ kind: 'preset', value }],
    });
  const values = [
    '',
    ' ',
    '0',
    '-0',
    '-1',
    '1',
    '1.5',
    '2',
    '300',
    '301',
    '8760',
    '8761',
    '1e309',
    '5e-324',
    'NaN',
    'Infinity',
    '0x10',
    '0b10',
    '1,5',
    '2abc',
  ];
  for (const value of values)
    cases.push({
      name: `text-control/${value}`,
      operations: [
        { kind: 'input', field: 'heatPumpCop', value, asText: true },
      ],
    });
  for (const field of Object.keys(INDUSTRIAL_HEAT_PUMP_FIXTURE)) {
    for (const value of values)
      cases.push({
        name: `${field}/${value}`,
        operations: [{ kind: 'input', field, value }],
      });
    cases.push({
      name: `missing-field/${field}`,
      missing: [`[name="${field}"]`],
      operations: [],
    });
  }
  for (let mask = 0; mask < 8; mask += 1)
    cases.push({
      name: `constraints-${mask}`,
      operations: [
        {
          kind: 'input',
          field: 'heatPumpMaxTemperatureC',
          value: mask & 1 ? '100' : '160',
        },
        {
          kind: 'input',
          field: 'availableElectricalPowerKw',
          value: mask & 2 ? '10' : '100',
        },
        {
          kind: 'input',
          field: 'electricityPricePerKwh',
          value: mask & 4 ? '0.5' : '0.1',
        },
      ],
    });
  for (const value of ['0.1', '5', '100'])
    cases.push({
      name: `payback-${value}`,
      operations: [{ kind: 'input', field: 'targetPaybackYears', value }],
    });
  cases.push({
    name: 'multiple-errors',
    operations: [
      { kind: 'input', field: 'annualOperatingHours', value: '0' },
      { kind: 'input', field: 'heatPumpCop', value: '0' },
      { kind: 'input', field: 'requiredSupplyTemperatureC', value: '-1' },
    ],
  });
  cases.push({
    name: 'zero-savings-hidden-nan',
    operations: [
      'installedCost',
      'incumbentFuelPricePerKwh',
      'electricityPricePerKwh',
      'annualMaintenanceCost',
    ].map(field => ({ kind: 'input', field, value: '0' })),
  });
  for (const selector of [
    '#assumptions-form',
    '#results',
    '#scenario-select',
    '#reset-button',
    '#export-button',
    '#print-button',
    '#page-status',
    '#validation-summary',
    '#overall-status',
    '#temperature-status',
    '#temperature-detail',
    '#power-status',
    '#power-detail',
    '#economics-status',
    '#economics-detail',
    '#fuel-input',
    '#electricity-input',
    '#fuel-cost',
    '#electricity-cost',
    '#maintenance-cost',
    '#annual-savings',
    '#simple-payback',
    '#minimum-cop',
    '#maximum-installed-cost',
    '#brief-summary',
    '#export-status',
    '#missing-measurements',
    '#commissioning-questions',
    '.comparison-grid',
    '.feasibility-grid',
    '.brief-card',
    '[data-error-for="heatPumpCop"]',
  ])
    cases.push({
      name: `missing/${selector}`,
      missing: [selector],
      operations: [{ kind: 'input', field: 'heatPumpCop', value: '0' }],
    });
  cases.push({
    name: 'change-event',
    operations: [{ kind: 'change', field: 'heatPumpCop', value: '3' }],
  });
  return cases;
}

/**
 * Observe real Intl calls and partial DOM state when each formatting step fails.
 * @returns {object[]} Original formatting/effect-order controls.
 */
export function heatPumpPresenterFormatCases() {
  return [
    { name: 'format-trace', observeFormats: true, operations: [] },
    ...Array.from({ length: 19 }, (_, index) => ({
      name: `format-failure-${index + 1}`,
      observeFormats: true,
      formatFailureAt: index + 1,
      operations: [],
    })),
  ];
}

/**
 * Preserve observable DOM mutation batches as well as final rendered states.
 * @returns {object[]} Independent write-order controls.
 */
export function heatPumpPresenterWriteCases() {
  const names = new Set([
    'base',
    'preset-conservative',
    'preset-optimistic',
    'preset-__proto__',
    'multiple-errors',
    'zero-savings-hidden-nan',
    'heatPumpCop/0',
    'heatPumpCop/',
    'payback-100',
  ]);
  return [
    ...heatPumpPresenterCases().filter(
      entry => names.has(entry.name) || entry.name.startsWith('constraints-')
    ),
    ...heatPumpPresenterFormatCases(),
  ].map(entry => ({
    ...entry,
    name: `writes/${entry.name}`,
    observeWrites: true,
  }));
}
