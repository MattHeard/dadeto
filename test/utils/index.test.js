import { describe, test, expect } from '@jest/globals';
import * as utils from '../../src/utils/index.js';

describe('utils/index', () => {
  test('exports all utility functions', () => {
    expect(typeof utils.isType).toBe('function');
    expect(typeof utils.isValidString).toBe('function');
    expect(typeof utils.isValidBoolean).toBe('function');
    expect(typeof utils.isEmpty).toBe('function');
    expect(typeof utils.isValidText).toBe('function');
    expect(typeof utils.safeTrim).toBe('function');
    expect(typeof utils.escapeRegex).toBe('function');
    expect(typeof utils.createPattern).toBe('function');
    expect(typeof utils.matchesPattern).toBe('function');
    expect(typeof utils.wrapWith).toBe('function');
    expect(typeof utils.wrapWithHtml).toBe('function');
    expect(typeof utils.pick).toBe('function');
    expect(typeof utils.mapValues).toBe('function');
  });

  test('exports markdown constants', () => {
    expect(utils.MARKDOWN_MARKERS).toBeDefined();
    expect(utils.HTML_TAGS).toBeDefined();
    expect(utils.CSS_CLASSES).toBeDefined();
    expect(utils.DEFAULT_OPTIONS).toBeDefined();
  });
});
