import { csvToJsonArrayToy } from '../../../src/core/toys/2025-10-19/csvToJsonArray.js';

describe('csvToJsonArrayToy', () => {
  it('converts multi-line CSV into a JSON array string', () => {
    const input = 'name,age\nAlice,30\nBob,25';
    const expected = JSON.stringify([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]);

    expect(csvToJsonArrayToy(input)).toBe(expected);
  });

  it('omits empty values from each record', () => {
    const input = 'name,age,city\nAlice,30,Seattle\nBob,,';
    const expected = JSON.stringify([
      { name: 'Alice', age: '30', city: 'Seattle' },
      { name: 'Bob' },
    ]);

    expect(csvToJsonArrayToy(input)).toBe(expected);
  });

  it('supports quoted values and ignores blank lines', () => {
    const input = 'name,notes\n"Alice","Loves apples, pears, and grapes"\n\n"Bob","Enjoys ""escaping"" characters"';
    const expected = JSON.stringify([
      {
        name: 'Alice',
        notes: 'Loves apples, pears, and grapes',
      },
      {
        name: 'Bob',
        notes: 'Enjoys "escaping" characters',
      },
    ]);

    expect(csvToJsonArrayToy(input)).toBe(expected);
  });

  it('returns an empty array string when the CSV is malformed', () => {
    expect(csvToJsonArrayToy('')).toBe(JSON.stringify([]));
    expect(csvToJsonArrayToy('headerOnly')).toBe(JSON.stringify([]));
    expect(csvToJsonArrayToy('a,b\n"unterminated')).toBe(JSON.stringify([]));
    expect(csvToJsonArrayToy('name,age\nAlice,30\n"Bob,25')).toBe(JSON.stringify([]));
    expect(csvToJsonArrayToy(42)).toBe(JSON.stringify([]));
  });

  it('requires the header row to contain non-empty column names', () => {
    const input = '   ,  , \nvalue1,value2,value3';

    expect(csvToJsonArrayToy(input)).toBe(JSON.stringify([]));
  });

  it('returns an empty array string when the header row is blank', () => {
    const input = '\nvalue1,value2';

    expect(csvToJsonArrayToy(input)).toBe(JSON.stringify([]));
  });

  it('fails when the header row cannot be parsed as CSV', () => {
    const input = '"unterminated header\nvalue1,value2';

    expect(csvToJsonArrayToy(input)).toBe(JSON.stringify([]));
  });

  it('returns an empty array string when no data rows remain after filtering', () => {
    const input = 'name,age\n  ,  ';

    expect(csvToJsonArrayToy(input)).toBe(JSON.stringify([]));
  });

  it('skips fields when the row provides fewer values than headers', () => {
    const input = 'name,age,city\nAlice,30';

    expect(csvToJsonArrayToy(input)).toBe(
      JSON.stringify([{ name: 'Alice', age: '30' }])
    );
  });
});
