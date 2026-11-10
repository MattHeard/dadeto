import { calculateIndustrialHeatPumpReadiness } from '../../../../src/browser/industrialHeatPumpReadiness.js';
import { INDUSTRIAL_HEAT_PUMP_FIXTURE } from '../../../fixtures/industrialHeatPumpReadiness.js';
import { createHeatPumpPresentation } from '../../../../src/logic/core/industrial-heat-pump/presentation.js';

const presentation = createHeatPumpPresentation({
  number: value => String(value),
  currency: value => String(value),
});
const required = { field: 'heatPumpCop', code: 'required' };

test('retains the absence of a field issue without reading an unrelated code', () => {
  const unrelated = {
    field: 'installedCost',
    get code() {
      throw new Error('unrelated code read');
    },
  };
  const field = presentation.fieldError('heatPumpCop', [unrelated]);
  expect(field.invalid).toBe(false);
  expect(field.message()).toBe('');
});

test.each([
  ['required', 'Enter a value.'],
  ['finite-number-required', 'Enter a finite number.'],
  ['below-minimum', 'Use a value above the required minimum.'],
  ['above-maximum', 'This value exceeds the supported range.'],
  ['object-required', undefined],
])(
  'projects the existing field message for %s without a fabricated fallback',
  (code, message) => {
    const field = presentation.fieldError('heatPumpCop', [
      { field: 'heatPumpCop', code },
    ]);
    expect(field.invalid).toBe(true);
    expect(field.message()).toBe(message);
  }
);

test('retains the first issue alias and reads its message only when consumed', () => {
  const first = { field: 'heatPumpCop', code: 'required' };
  const field = presentation.fieldError('heatPumpCop', [
    first,
    { field: 'heatPumpCop', code: 'below-minimum' },
  ]);
  expect(field.invalid).toBe(true);
  first.code = 'above-maximum';
  expect(field.message()).toBe('This value exceeds the supported range.');
});

test.each([0, 1, 2, 12])(
  'preserves validation summary visibility and wording for %s field issues',
  count => {
    const summary = presentation.errorSummary(Array(count).fill(required));
    expect(summary.hidden()).toBe(count === 0);
    expect(summary.sectionHidden()).toBe(count > 0);
    expect(summary.overallStatus()).toBe(
      count ? 'Results are hidden until assumptions are corrected.' : null
    );
    const expected = {
      0: '',
      1: '1 assumption need attention. Results are hidden until corrected.',
      2: '2 assumptions need attention. Results are hidden until corrected.',
      12: '12 assumptions need attention. Results are hidden until corrected.',
    };
    expect(summary.text()).toBe(expected[count]);
  }
);

test('prioritizes the first global issue even when it has no message', () => {
  const errors = [
    required,
    { field: 'input', code: 'object-required' },
    { field: 'input', code: 'calculation-not-finite' },
  ];
  expect(presentation.errorSummary(errors).text()).toBeUndefined();
  expect(
    presentation
      .errorSummary([{ field: 'input', code: 'calculation-not-finite' }])
      .text()
  ).toBe(
    'These assumptions exceed the supported numeric range. Reduce the extreme values to calculate a screening result.'
  );
});

test('keeps error visibility and message evaluation lazy across effect boundaries', () => {
  const errors = [required];
  const summary = presentation.errorSummary(errors);
  expect(summary.hidden()).toBe(false);
  errors.length = 0;
  expect(summary.text()).toBe('');
  expect(summary.overallStatus()).toBeNull();
  expect(summary.sectionHidden()).toBe(false);
});

for (const selector of ['#minimum-cop', '#maximum-installed-cost']) {
  test.each([{ status: 'available', value: 3 }, { status: 'not-achievable' }])(
    `retains repeated threshold observations at ${selector}: %p`,
    second => {
      const comparison = calculateIndustrialHeatPumpReadiness(
        INDUSTRIAL_HEAT_PUMP_FIXTURE
      ).comparison;
      let reads = 0;
      Object.defineProperty(comparison, 'thresholds', {
        get() {
          const value =
            ++reads === 1 ? { status: 'available', value: 2 } : second;
          return {
            minimumCopForTargetPayback: value,
            maximumInstalledCostForTargetPayback: value,
          };
        },
      });
      const observed = [];
      const view = createHeatPumpPresentation({
        number: value => {
          observed.push(value);
          return 'formatted';
        },
        currency: value => {
          observed.push(value);
          return 'formatted';
        },
      });
      const operation = view
        .comparisonUpdates(INDUSTRIAL_HEAT_PUMP_FIXTURE, comparison)
        .find(update => update.selector === selector);
      expect(reads).toBe(0);
      expect(operation.value()).toBe('formatted');
      expect(reads).toBe(2);
      expect(observed).toEqual([second.value]);
    }
  );
}

test.each([
  [null, 'Custom assumptions'],
  [{ label: '' }, ''],
  [{ label: ' Preset name ' }, ' Preset name '],
])(
  'projects only the explicit custom/preset name policy for %p',
  (scenario, expected) => {
    expect(presentation.scenarioName(scenario)).toBe(expected);
  }
);
