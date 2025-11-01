import { describe, expect, it } from '@jest/globals';
import {
  ensureKeyValueInput as coreEnsureKeyValueInput,
  handleKVType as coreHandleKVType,
  kvHandler as coreKvHandler,
} from '../../../src/core/browser/inputHandlers/kv.js';
import {
  ensureKeyValueInput as browserEnsureKeyValueInput,
  handleKVType as browserHandleKVType,
  kvHandler as browserKvHandler,
} from '../../../src/browser/toys.js';

describe('kv input handler re-exports', () => {
  it('points to the browser implementations', () => {
    expect(coreEnsureKeyValueInput).toBe(browserEnsureKeyValueInput);
    expect(coreHandleKVType).toBe(browserHandleKVType);
    expect(coreKvHandler).toBe(browserKvHandler);
  });
});
