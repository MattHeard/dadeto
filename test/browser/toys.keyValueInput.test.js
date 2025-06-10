import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as toys from '../../src/browser/toys.js';
const { ensureKeyValueInput, createKeyInputHandler, createValueInputHandler } =
  toys;

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

  let container;
  let textInput;
  let dom;
  let mockSyncHiddenField;
  let mockRender;
  let disposers;

  beforeEach(() => {
    // Create container and text input
    container = {};
    textInput = {};

    // Mock DOM utilities with no-op functions
    dom = {
      createElement: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setValue: jest.fn(),
      getValue: jest.fn(),
      setDataAttribute: jest.fn(),
      getDataAttribute: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      setTextContent: jest.fn(),
      setClassName: jest.fn(),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(),
      createTextNode: jest.fn(),
      insertBefore: jest.fn(),
      removeAttribute: jest.fn(),
      setAttribute: jest.fn(),
      hasAttribute: jest.fn(),
      focus: jest.fn(),
      click: jest.fn(),
      createDocumentFragment: jest.fn(),
      getTargetValue: jest.fn(),
      getNextSibling: jest.fn(),
      removeAllChildren: jest.fn(),
    };

    // Mock sync function
    mockSyncHiddenField = jest.fn();

    // Mock render function
    mockRender = jest.fn();

    // Initialize disposers array
    disposers = [];
  });

});
