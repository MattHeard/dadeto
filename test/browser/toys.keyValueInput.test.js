import { describe, it, expect, jest } from '@jest/globals';
import { ensureKeyValueInput } from '../../src/browser/toys.js';

describe('Key-Value Input', () => {
  it('creates a key-value container when none exists', () => {
    const container = {};
    const textInput = {};
    const kvContainer = {};
    const nextSibling = {};
    const querySelector = jest.fn();
    const createElement = jest.fn().mockReturnValue(kvContainer);
    const setClassName = jest.fn();
    const getNextSibling = jest.fn().mockReturnValue(nextSibling);
    const insertBefore = jest.fn();
    const dom = {
      querySelector,
      createElement,
      setClassName,
      getNextSibling,
      insertBefore,
      removeAllChildren: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setValue: jest.fn(),
      setDataAttribute: jest.fn(),
      addEventListener: jest.fn(),
      setTextContent: jest.fn(),
      appendChild: jest.fn(),
      getValue: jest.fn(),
      addClass: jest.fn(),
      hide: jest.fn(),
    };
    const result = ensureKeyValueInput(container, textInput, dom);
    expect(createElement).toHaveBeenNthCalledWith(1, 'div');
    expect(setClassName).toHaveBeenCalledWith(kvContainer, 'kv-container');
    expect(getNextSibling).toHaveBeenCalledWith(textInput);
    expect(insertBefore).toHaveBeenCalledWith(
      container,
      kvContainer,
      nextSibling
    );
    expect(result).toBe(kvContainer);
  });

  // Previously additional setup was defined here for more tests, but the
  // corresponding test cases were removed. The leftover variables and beforeEach
  // block have been deleted to resolve linter warnings about unused variables.
});
