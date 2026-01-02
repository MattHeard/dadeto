import { describeCyclomaticFactors } from '../../src/build/cyclomatic-factors.js';

describe('Cyclomatic factors analyzer', () => {
  it('extracts branching hints for functions', () => {
    const code = `function summarize(items) {
  for (const item of items) {
    if (item.active || item.pending) {
      continue;
    }
  }
  try {
    return items.length;
  } catch (error) {
    return 0;
  }
}

function decide(flag) {
  switch (flag) {
    case true:
      return "yes";
    default:
      return "no";
  }
}

const helper = (value) => (value ? value.done : false)
  ? value.success
  : false;

function validate(value) {
  return value === null || value === undefined || value === "";
}`;

    const factors = describeCyclomaticFactors(code);

    expect(factors.some(entry => entry.includes('for-of loop'))).toBe(true);
    expect(factors.some(entry => entry.includes('if statement'))).toBe(true);
    expect(
      factors.some(entry =>
        entry.includes(
          'logical || (value === null || value === undefined || value === "")'
        )
      )
    ).toBe(true);
    expect(
      factors.some(entry =>
        entry.includes('logical || (value === null || value === undefined)')
      )
    ).toBe(true);
    expect(factors.some(entry => entry.includes('catch clause'))).toBe(true);
    expect(factors.some(entry => entry.includes('switch case'))).toBe(true);
    expect(factors.some(entry => entry.includes('ternary expression'))).toBe(
      true
    );
  });
});
