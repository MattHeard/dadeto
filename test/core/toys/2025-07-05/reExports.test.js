import { describe, expect, test } from '@jest/globals';
import * as baseObjectUtils from '../../../../src/core/objectUtils.js';
import * as reExportedObjectUtils from '../../../../src/core/toys/2025-07-05/objectUtils.js';
import * as baseValidation from '../../../../src/core/validation.js';
import * as reExportedValidation from '../../../../src/core/toys/2025-07-05/validation.js';

describe('add dendrite page re-exports', () => {
  function expectModuleExportsToMatch(baseModule, reExportedModule) {
    const baseKeys = Object.keys(baseModule).sort();
    const reExportedKeys = Object.keys(reExportedModule).sort();
    expect(reExportedKeys).toEqual(baseKeys);
    for (const key of baseKeys) {
      expect(reExportedModule[key]).toBe(baseModule[key]);
    }
  }

  test('object utils match the core utilities', () => {
    expectModuleExportsToMatch(baseObjectUtils, reExportedObjectUtils);
  });

  test('validation helpers mirror the core validation module', () => {
    expectModuleExportsToMatch(baseValidation, reExportedValidation);
  });
});
