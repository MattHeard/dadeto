import {
  parseHeatPumpFieldValue,
  parseHeatPumpScenario,
} from '../../../../src/logic/boundary/industrial-heat-pump/presentation-input.js';
import { INDUSTRIAL_HEAT_PUMP_SCENARIOS } from '../../../../src/logic/core/industrial-heat-pump/scenarios.js';

test.each([
  [undefined, NaN],
  [null, NaN],
  [{ value: '' }, NaN],
  [{ value: '  \t\n' }, NaN],
  [{ value: ' 2 ' }, 2],
  [{ value: '-0' }, -0],
  [{ value: '0' }, 0],
  [{ value: '0x10' }, 16],
  [{ value: '0b10' }, 2],
  [{ value: '1e309' }, Infinity],
  [{ value: '-Infinity' }, -Infinity],
  [{ value: 'NaN' }, NaN],
  [{ value: '2abc' }, NaN],
  [{ value: '1,5' }, NaN],
  [{ value: '12.34' }, 12.34],
  [{ value: '5e-324' }, Number.MIN_VALUE],
])('retains original form string interpretation for %p', (slot, expected) => {
  const parsed = parseHeatPumpFieldValue(slot);
  expect(parsed.ok).toBe(true);
  expect(parsed.evidence).toBe(expected);
});

test.each(['3', ' ', '0x10'])(
  're-reads the nonblank slot for conversion to %p',
  second => {
    let reads = 0;
    const slot = {
      get value() {
        return ++reads === 1 ? '2' : second;
      },
    };
    const parsed = parseHeatPumpFieldValue(slot);
    expect(parsed.ok).toBe(true);
    expect(parsed.evidence).toBe({ 3: 3, ' ': 0, '0x10': 16 }[second]);
    expect(reads).toBe(2);
  }
);

test('does not re-read a blank field', () => {
  let reads = 0;
  const parsed = parseHeatPumpFieldValue({
    get value() {
      reads += 1;
      if (reads > 1) throw new Error('unexpected read');
      return ' ';
    },
  });
  expect(parsed.ok).toBe(true);
  expect(parsed.evidence).toBeNaN();
  expect(reads).toBe(1);
});

for (const position of [1, 2]) {
  test.each([
    undefined,
    null,
    false,
    0,
    'error',
    Symbol('error'),
    new Error('error'),
    { code: 17 },
  ])(`captures the original thrown value on read${position}: %p`, error => {
    let reads = 0;
    const parsed = parseHeatPumpFieldValue({
      get value() {
        if (++reads === position) throw error;
        return '2';
      },
    });
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBe(error);
    expect(reads).toBe(position);
  });
}

test.each(['base', 'conservative', 'optimistic'])(
  'retains exact preset identity for %s',
  value => {
    expect(parseHeatPumpScenario(value)).toBe(
      INDUSTRIAL_HEAT_PUMP_SCENARIOS[value]
    );
  }
);

test.each([
  '',
  'custom',
  'unknown',
  '__proto__',
  'constructor',
  'toString',
  ' base',
  'base ',
  'BASE',
  '\u0000',
  'optimistic\n',
])('interprets unrecognized exact selector text %p as custom', value => {
  expect(parseHeatPumpScenario(value)).toBeNull();
});
