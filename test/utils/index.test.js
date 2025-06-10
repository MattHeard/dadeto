import { describe, test, expect } from '@jest/globals';
import * as utils from '../../src/utils/index.js';

describe('utils/index', () => {
  test('exports all utility functions', () => {
    [
      'isType',
      'isValidString',
      'isValidBoolean',
      'isEmpty',
      'isValidText',
      'safeTrim',
      'escapeRegex',
      'createPattern',
      'matchesPattern',
      'pick',
      'mapValues',
    ].forEach(name => {
      expect(typeof utils[name]).toBe('function');
    });
  });

  test('exports markdown constants', () => {
    ['markdownMarkers', 'htmlTags', 'cssClasses', 'defaultOptions'].forEach(
      name => {
        expect(utils[name]).toBeDefined();
      }
    );
  });
});
