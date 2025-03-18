// textFormatter.test.js

import { getFormattedText } from '../src/textFormatter';

describe('getFormattedText', () => {
  const testCases = [
    { text: '', expected: '' },
    { text: 'foo', expected: 'foo' },
    { text: '**foo**', expected: '<strong>**foo**</strong>' },
    { text: '**bar**', expected: '<strong>**bar**</strong>' },
    { text: '__foo__', expected: '<em>__foo__</em>' },
  ];

  testCases.forEach((testCase, index) => {
    it(`should return ${testCase.expected} when given ${testCase.text} as input`, () => {
      const formattedText = getFormattedText(testCase.text);
      expect(formattedText).toBe(testCase.expected);
    });
  });
});
