import { expect, test } from '@jest/globals';
import {
  LOGIC_SOURCE_ROOTS,
  isLogicJavaScriptPath,
} from '../../../src/core/local/logic-source-paths.js';

test('declares immutable measured migration roots', () => {
  expect(LOGIC_SOURCE_ROOTS).toEqual([
    'src/core',
    'src/logic/core',
    'src/logic/boundary',
  ]);
  expect(Object.isFrozen(LOGIC_SOURCE_ROOTS)).toBe(true);
});
test.each([
  'src/core/example.js',
  'src/logic/core/example.js',
  'src/logic/boundary/nested/input.js',
])('measures %s', file => expect(isLogicJavaScriptPath(file)).toBe(true));
test.each([
  'src/core',
  'src/logic/core',
  'src/logic/boundary',
  'src/core/example.ts',
  'src/logic/core/example.json',
  'src/logic/boundary/example.JS',
  'src/coreish/example.js',
  'src/logic/coreish/example.js',
  'src/logic/boundaryish/example.js',
  'src/logic/other/example.js',
  'src/logic/example.js',
  'src/browser/example.js',
  'other/src/core/example.js',
  './src/core/example.js',
])('keeps %s outside the measured JavaScript roots', file =>
  expect(isLogicJavaScriptPath(file)).toBe(false)
);
