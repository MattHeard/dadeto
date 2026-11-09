import { parseIndustrialHeatPumpInput } from '../../../../src/logic/boundary/industrial-heat-pump/input.js';
import { calculateIndustrialHeatPumpReadiness } from '../../../../src/browser/industrialHeatPumpReadiness.js';
import { INDUSTRIAL_HEAT_PUMP_FIXTURE } from '../../../fixtures/industrialHeatPumpReadiness.js';

const base = INDUSTRIAL_HEAT_PUMP_FIXTURE;

test.each([
  undefined,
  null,
  false,
  true,
  0,
  1,
  1n,
  '',
  '2',
  Symbol('root'),
  () => base,
  [],
  [base],
])('totally interprets a non-object record candidate %p', input => {
  expect(parseIndustrialHeatPumpInput(input)).toEqual({
    ok: true,
    evidence: {
      valid: false,
      errors: [{ field: 'input', code: 'object-required' }],
    },
  });
});

test.each([
  Object.assign(Object.create(null), base),
  Object.assign(new Date(0), base),
  Object.create({}, Object.getOwnPropertyDescriptors(base)),
])('accepts own fields without constructor restrictions or coercion', input => {
  const parsed = parseIndustrialHeatPumpInput(input);
  expect(parsed.ok).toBe(true);
  expect(parsed.evidence.valid).toBe(true);
  expect(parsed.evidence.assumptions).toBe(input);
});

test('rejects inherited fields and ignores unrelated extra values', () => {
  expect(
    parseIndustrialHeatPumpInput(Object.create(base)).evidence.errors
  ).toEqual(Object.keys(base).map(field => ({ field, code: 'required' })));
  const input = { ...base, extra: Symbol('ignored') };
  expect(parseIndustrialHeatPumpInput(input).evidence.assumptions).toBe(input);
  expect(
    parseIndustrialHeatPumpInput({ ...base, heatPumpCop: '2' }).evidence.errors
  ).toEqual([{ field: 'heatPumpCop', code: 'finite-number-required' }]);
});

const sentinels = [
  undefined,
  null,
  false,
  0,
  'failure',
  Symbol('failure'),
  new Error('failure'),
  { code: 17 },
];
for (const field of Object.keys(base)) {
  test.each(sentinels)(
    `captures and rethrows exact native getter failures for ${field}: %p`,
    error => {
      const input = { ...base };
      Object.defineProperty(input, field, {
        get: () => {
          throw error;
        },
      });
      const parsed = parseIndustrialHeatPumpInput(input);
      expect(parsed.ok).toBe(false);
      expect(parsed.error).toBe(error);
      let thrown = false;
      try {
        calculateIndustrialHeatPumpReadiness(input);
      } catch (actual) {
        thrown = true;
        expect(actual).toBe(error);
      }
      expect(thrown).toBe(true);
    }
  );
}

test('captures proxy presence failures without replacing the thrown value', () => {
  const error = { code: 'presence' };
  const input = new Proxy(
    { ...base },
    {
      getOwnPropertyDescriptor: () => {
        throw error;
      },
    }
  );
  expect(parseIndustrialHeatPumpInput(input)).toEqual({ ok: false, error });
});
