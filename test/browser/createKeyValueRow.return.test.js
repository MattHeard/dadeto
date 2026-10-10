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
    const configureRows = createKeyValueRow(
      dom,
      textInput,
      { rows, rowTypes: {} },
      syncHiddenField
    );
    const rowHandler = configureRows(entries, disposers, render, container);
    expect(typeof rowHandler).toBe('function');
    expect(rowHandler.length).toBe(2);
  });

  it('has two four-argument stages before the two-argument row handler', () => {
    const dom = {};
    const entries = [];
    const textInput = {};
    const rows = {};
    const syncHiddenField = () => {};
    const disposers = [];
    const render = () => {};
    const container = {};

    expect(createKeyValueRow.length).toBe(4);

    const configureFirst = createKeyValueRow(
      dom,
      textInput,
      { rows, rowTypes: {} },
      syncHiddenField
    );
    const configureSecond = createKeyValueRow(
      dom,
      textInput,
      { rows, rowTypes: {} },
      syncHiddenField
    );
    const first = configureFirst(entries, disposers, render, container);
    const second = configureSecond(entries, disposers, render, container);

    expect(typeof first).toBe('function');
    expect(typeof second).toBe('function');
    expect(configureFirst).not.toBe(configureSecond);
    expect(configureFirst.length).toBe(4);
    expect(first.length).toBe(2);
    expect(second.length).toBe(2);
  });
});
