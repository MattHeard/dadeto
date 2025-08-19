import { describe, test, expect } from '@jest/globals';
import {
  ensureKeyValueInput,
  handleKVType,
  kvHandler,
} from '../../src/inputHandlers/kv.js';

describe('kv input handlers module', () => {
  test('re-exports key functions', () => {
    expect(typeof ensureKeyValueInput).toBe('function');
    expect(typeof handleKVType).toBe('function');
    expect(typeof kvHandler).toBe('function');
  });
});
