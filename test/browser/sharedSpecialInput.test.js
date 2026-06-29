import { describe, expect, jest, test } from '@jest/globals';
import {
  createOrReuseSpecialInput,
  createSpecialInputEnsurer,
  ensureSpecialInput,
  reuseOrInsertSpecialInput,
} from '../../src/core/browser/inputHandlers/sharedSpecialInput.js';

describe('sharedSpecialInput', () => {
  test('reuses an existing special input without inserting', () => {
    const existing = {};
    const createSpecialInput = jest.fn();
    const dom = {
      querySelector: jest.fn(),
    };

    expect(
      reuseOrInsertSpecialInput({
        specialInput: existing,
        container: {},
        textInput: {},
        dom,
        createSpecialInput,
      })
    ).toBe(existing);
    expect(createSpecialInput).not.toHaveBeenCalled();
  });

  test('ensures and inserts a special input when none exists', () => {
    const created = {};
    const dom = {
      querySelector: jest.fn(() => null),
      getNextSibling: jest.fn(() => null),
      insertBefore: jest.fn(),
    };
    const element = ensureSpecialInput({
      selector: '.special',
      container: {},
      textInput: {},
      dom,
      createSpecialInput: () => created,
    });

    expect(element).toBe(created);
    expect(dom.insertBefore).toHaveBeenCalledWith({}, created, null);
  });

  test('returns an ensurer that preserves a cached existing input', () => {
    const existing = {};
    const dom = {
      querySelector: jest.fn(() => existing),
    };
    const ensurer = createSpecialInputEnsurer({
      selector: '.special',
      container: {},
      textInput: {},
      dom,
    });
    const created = {};

    expect(ensurer.existingSpecialInput).toBe(existing);
    expect(ensurer.ensure(() => created)).toBe(existing);
  });

  test('creates or reuses a special input', () => {
    const existing = {};
    const dom = {
      querySelector: jest.fn(() => existing),
    };

    expect(
      createOrReuseSpecialInput(
        {
          selector: '.special',
          container: {},
          textInput: {},
          dom,
        },
        () => ({})
      )
    ).toBe(existing);
  });
});
