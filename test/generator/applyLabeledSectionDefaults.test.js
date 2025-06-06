import { describe, test, expect } from '@jest/globals';
import { applyLabeledSectionDefaults } from '../../src/generator/generator.js';

describe('applyLabeledSectionDefaults', () => {
  test('defaults keyExtraClasses to empty string', () => {
    const args = { wrapValueDiv: false };
    const result = applyLabeledSectionDefaults({ ...args });
    expect(result.keyExtraClasses).toBe('');
  });
});
