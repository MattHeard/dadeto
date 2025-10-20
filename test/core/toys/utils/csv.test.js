import { parseCsvLine } from '../../../../src/core/toys/utils/csv.js';

describe('parseCsvLine', () => {
  it('returns null when provided a non-string input', () => {
    expect(parseCsvLine()).toBeNull();
    expect(parseCsvLine(42)).toBeNull();
  });

  it('splits unquoted comma-separated values', () => {
    expect(parseCsvLine('alpha,beta,gamma')).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('handles quoted fields and escaped quotes', () => {
    const input = '"quoted, field","He said ""Hello"""';

    expect(parseCsvLine(input)).toEqual(['quoted, field', 'He said "Hello"']);
  });

  it('returns null when a quoted field is not terminated', () => {
    expect(parseCsvLine('"unterminated,field')).toBeNull();
  });
});
