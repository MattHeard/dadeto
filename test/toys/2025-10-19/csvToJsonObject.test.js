import { csvToJsonObjectToy } from '../../../src/toys/2025-10-19/csvToJsonObject.js';

describe('csvToJsonObjectToy', () => {
  it('converts two-line CSV into a JSON object string', () => {
    const input = 'name,age\nAlice,30';
    const expected = JSON.stringify({
      name: 'Alice',
      age: '30',
    });

    expect(csvToJsonObjectToy(input)).toBe(expected);
  });

  it('omits keys that have no corresponding value', () => {
    const input = 'name,age,city\nAlice,30,';
    const expected = JSON.stringify({
      name: 'Alice',
      age: '30',
    });

    expect(csvToJsonObjectToy(input)).toBe(expected);
  });

  it('supports quoted values containing commas', () => {
    const input = 'name,notes\n"Alice","Loves apples, pears, and grapes"';
    const expected = JSON.stringify({
      name: 'Alice',
      notes: 'Loves apples, pears, and grapes',
    });

    expect(csvToJsonObjectToy(input)).toBe(expected);
  });

  it('returns an empty object string when the CSV is malformed', () => {
    expect(csvToJsonObjectToy('')).toBe(JSON.stringify({}));
    expect(csvToJsonObjectToy('headerOnly')).toBe(JSON.stringify({}));
    expect(csvToJsonObjectToy('a,b\n"unterminated')).toBe(JSON.stringify({}));
    expect(csvToJsonObjectToy('a\n1\n2')).toBe(JSON.stringify({}));
    expect(csvToJsonObjectToy(42)).toBe(JSON.stringify({}));
  });
});
