import {
  escapeStaticJsonlAttribute,
  escapeStaticJsonlText,
} from '../../../../src/logic/core/static-jsonl-table/escaping.js';

test('escapes every attribute metacharacter while retaining quotes and Unicode policy', () => {
  expect(escapeStaticJsonlAttribute('&"<>\' café →')).toBe(
    "&amp;&quot;&lt;&gt;' café →"
  );
  expect(escapeStaticJsonlAttribute('&amp;')).toBe('&amp;amp;');
  expect(escapeStaticJsonlAttribute('')).toBe('');
});
test('escapes text in its original order without escaping quotation marks', () => {
  expect(escapeStaticJsonlText('&"<>\' café →')).toBe(
    '&amp;"&lt;&gt;\' café →'
  );
  expect(escapeStaticJsonlText('&lt;')).toBe('&amp;lt;');
  expect(escapeStaticJsonlText('')).toBe('');
});
