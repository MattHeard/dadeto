/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ensureKeyValueInput, createKeyInputHandler, createValueInputHandler } from '../../src/browser/toys.js';

describe('Key-Value Input', () => {
  let container;
  let textInput;
  let dom;
  let mockSyncHiddenField;
  let mockRender;
  let disposers;

  beforeEach(() => {
    // Reset the DOM
    document.body.innerHTML = '';

    // Create container and text input
    container = document.createElement('div');
    textInput = document.createElement('input');
    textInput.type = 'hidden';
    container.appendChild(textInput);
    document.body.appendChild(container);

    // Mock DOM utilities
    dom = {
      createElement: jest.fn().mockImplementation(tag => document.createElement(tag)),
      setType: jest.fn().mockImplementation((el, type) => { el.type = type; }),
      setPlaceholder: jest.fn().mockImplementation((el, text) => { el.placeholder = text; }),
      setValue: jest.fn().mockImplementation((el, value) => { el.value = value; }),
      getValue: jest.fn().mockImplementation(el => el.value),
      setDataAttribute: jest.fn().mockImplementation((el, name, value) => { el.dataset[name] = value; }),
      getDataAttribute: jest.fn().mockImplementation((el, name) => el.dataset[name]),
      addEventListener: jest.fn().mockImplementation((el, event, handler) => { el.addEventListener(event, handler); }),
      removeEventListener: jest.fn().mockImplementation((el, event, handler) => { el.removeEventListener(event, handler); }),
      setTextContent: jest.fn().mockImplementation((el, text) => { el.textContent = text; }),
      setClassName: jest.fn().mockImplementation((el, className) => { el.className = className; }),
      appendChild: jest.fn().mockImplementation((parent, child) => { parent.appendChild(child); }),
      getTargetValue: jest.fn().mockImplementation(e => e.target.value),
      querySelector: jest.fn().mockImplementation((el, selector) => el.querySelector(selector)),
      querySelectorAll: jest.fn().mockImplementation((el, selector) => Array.from(el.querySelectorAll(selector))),
      getNextSibling: jest.fn().mockImplementation(el => el.nextSibling),
      insertBefore: jest.fn().mockImplementation((parent, newChild, refChild) => {
        return parent.insertBefore(newChild, refChild);
      }),
      removeAllChildren: jest.fn().mockImplementation(el => {
        while (el.firstChild) {
          el.removeChild(el.firstChild);
        }
      })
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
      keyEl = document.createElement('input');
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
      expect(dom.setDataAttribute).toHaveBeenCalledWith(keyEl, 'prevKey', 'newKey');
      expect(mockSyncHiddenField).toHaveBeenCalledWith(textInput, rows, dom);
    });
  });

  describe('createValueInputHandler', () => {
    let handler;
    let keyEl;
    let event;
    let rows;

    beforeEach(() => {
      rows = { myKey: 'oldValue' };
      keyEl = document.createElement('input');
      dom.setDataAttribute(keyEl, 'prevKey', 'myKey');
      event = { target: { value: 'newValue' } };
      handler = createValueInputHandler(dom, keyEl, textInput, rows, mockSyncHiddenField);
    });

    it('should update the value for the corresponding key', () => {
      // Trigger handler
      handler(event);

      // Verify rows were updated
      expect(rows).toEqual({ myKey: 'newValue' });
      expect(mockSyncHiddenField).toHaveBeenCalledWith(textInput, rows, dom);
    });
  });

  describe('ensureKeyValueInput', () => {
    it('should create a key-value input interface', () => {
      // Set initial value in the text input
      textInput.value = JSON.stringify({ key1: 'value1', key2: 'value2' });

      // Call the function
      const result = ensureKeyValueInput(container, textInput, dom);

      // Verify the container was created
      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.className).toContain('kv-container');

      // Verify rows were created for each key-value pair
      const rows = result.querySelectorAll('.kv-row');
      expect(rows.length).toBe(2);

      // Verify add button was created
      const addButton = result.querySelector('button');
      expect(addButton).not.toBeNull();
      // The actual implementation uses '×' for the add button
      expect(addButton.textContent).toContain('×');
    });
  });
});
