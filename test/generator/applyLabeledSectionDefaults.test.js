import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/generator/generator.js'
);

function getApplyLabeledSectionDefaults() {
  let code = readFileSync(filePath, 'utf8');
  code = code.replace(/^import[^;]*;\n/gm, '');
  code = code.replace(/export (function|const|let|var)/g, '$1');
  return new Function(`${code}; return applyLabeledSectionDefaults;`)();
}

describe('applyLabeledSectionDefaults', () => {
  test('defaults wrapValueDiv and keyExtraClasses', () => {
    const fn = getApplyLabeledSectionDefaults();
    const args = {};
    const result = fn(args);
    expect(result.wrapValueDiv).toBe(true);
    expect(result.keyExtraClasses).toBe('');
    expect(args).toEqual(result);
  });

  test('preserves existing properties', () => {
    const fn = getApplyLabeledSectionDefaults();
    const args = { wrapValueDiv: false, keyExtraClasses: 'foo' };
    const result = fn(args);
    expect(result.wrapValueDiv).toBe(false);
    expect(result.keyExtraClasses).toBe('foo');
    expect(args).toEqual(result);
  });
});
