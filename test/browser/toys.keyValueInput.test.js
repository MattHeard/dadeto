import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ensureKeyValueInput, createKeyInputHandler, createValueInputHandler } from '../../src/browser/toys.js';

describe('Key-Value Input', () => {
  it('should fail when called with no arguments', () => {
    const container = {};
    const textInput = {};
    const kvContainer = {};
    const querySelector = jest.fn();
    const createElement = jest.fn().mockReturnValue(kvContainer);
    const setClassName = jest.fn();
    const getNextSibling = jest.fn();
    const insertBefore = jest.fn();
    const removeAllChildren = jest.fn();
    const setType = jest.fn();
    const setPlaceholder = jest.fn();
    const setValue = jest.fn();
    const setDataAttribute = jest.fn();
    const addEventListener = jest.fn();
    const setTextContent = jest.fn();
    const appendChild = jest.fn();
    const dom = { querySelector, createElement, setClassName, getNextSibling, insertBefore, removeAllChildren, setType, setPlaceholder, setValue, setDataAttribute, addEventListener, setTextContent, appendChild };
    ensureKeyValueInput(container, textInput, dom);
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

  describe('createKeyInputHandler', () => {
    let handler;
    let keyEl;
    let event;
    let rows;

    beforeEach(() => {
      rows = { existingKey: 'existingValue' };
      keyEl = {};
      event = { target: keyEl };
      handler = createKeyInputHandler(dom, keyEl, textInput, rows, mockSyncHiddenField);
    });

    it('should update rows when key is changed to a new unique key', () => {
      // Initial state
      dom.getDataAttribute.mockReturnValue('oldKey');
      dom.getTargetValue.mockReturnValue('newKey');
      rows.oldKey = 'someValue';

      // Trigger handler
      handler(event);

      // Verify rows were updated
      expect(rows).toEqual({
        existingKey: 'existingValue',
        newKey: 'someValue'
      });
      expect(rows).not.toHaveProperty('oldKey');
      expect(dom.getDataAttribute).toHaveBeenCalledTimes(1);
      expect(dom.getDataAttribute).toHaveBeenCalledWith(keyEl, 'prevKey');
      expect(dom.setDataAttribute).toHaveBeenCalledWith(keyEl, 'prevKey', 'newKey');
      expect(mockSyncHiddenField).toHaveBeenCalledWith(textInput, rows, dom);
    });
  });


});
