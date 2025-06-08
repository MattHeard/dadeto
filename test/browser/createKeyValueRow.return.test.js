import { describe, it, expect } from '@jest/globals';
import { createKeyValueRow } from '../../src/browser/toys.js';

describe('createKeyValueRow return value', () => {
  it('returns a handler function accepting [key,value] and index', () => {
    const dom = {};
    const entries = [];
    const textInput = {};
    const rows = {};
    const syncHiddenField = () => {};
    const disposers = [];
    const render = () => {};
    const container = {};
    const rowHandler = createKeyValueRow(
      dom,
      entries,
      textInput,
      rows,
      syncHiddenField,
      disposers,
      render,
      container
    );
    expect(typeof rowHandler).toBe('function');
    expect(rowHandler.length).toBe(2);
  });
});
