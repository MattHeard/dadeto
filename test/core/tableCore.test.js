import { compareTableValues } from '../../src/core/tableCore.js';
import { compareValues } from '../../src/core/build/staticJsonlTable.js';

test('build compatibility export uses the same numeric and lexical policy', () => {
  expect(compareValues).toBe(compareTableValues);
  expect(compareValues(2, 10)).toBe(-1);
  expect(compareValues('a', 'b', 'toString')).toBe(-1);
  expect(compareTableValues(2, 10, 'number')).toBe(-8);
  expect(compareTableValues(10, '2', 'number')).toBe(8);
  expect(compareTableValues('10', '2')).toBe(-1);
  expect(compareTableValues('2', '10')).toBe(1);
  expect(compareTableValues('same', 'same')).toBe(0);
  expect(compareTableValues('2', '10', 'number')).toBe(-8);
});
