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
    const rowHandler = createKeyValueRow({
      dom,
      entries,
      textInput,
      rows,
      syncHiddenField,
      disposers,
      render,
      container,
    });
    expect(typeof rowHandler).toBe('function');
    expect(rowHandler.length).toBe(2);
  });

  it('has an arity of 1 and each call returns a new unary function', () => {
    const dom = {};
    const entries = [];
    const textInput = {};
    const rows = {};
    const syncHiddenField = () => {};
    const disposers = [];
    const render = () => {};
    const container = {};

    expect(createKeyValueRow.length).toBe(1);

    const first = createKeyValueRow({
      dom,
      entries,
      textInput,
      rows,
      syncHiddenField,
      disposers,
      render,
      container,
    });

    const second = createKeyValueRow({
      dom,
      entries,
      textInput,
      rows,
      syncHiddenField,
      disposers,
      render,
      container,
    });

    expect(typeof first).toBe('function');
    expect(typeof second).toBe('function');
    expect(first).not.toBe(second);
    expect(first.length).toBe(2);
    expect(second.length).toBe(2);
  });
});
