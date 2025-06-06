import { describe, test, expect } from '@jest/globals';
import { applyLabeledSectionDefaults } from '../../src/generator/generator.js';

describe('applyLabeledSectionDefaults', () => {
  test('sets default keyExtraClasses', () => {
    const args = { label: 'l', valueHTML: '<span>v</span>' };
    const result = applyLabeledSectionDefaults(args);
    expect(result.keyExtraClasses).toBe('');
    expect(result.wrapValueDiv).toBe(true);
  });
});
