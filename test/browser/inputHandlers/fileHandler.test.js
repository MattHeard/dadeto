import { describe, expect, it, jest } from '@jest/globals';
import { fileHandler } from '../../../src/core/browser/inputHandlers/file.js';
import { readStoredOrElementValue } from '../../../src/core/browser/inputValueStore.js';

/**
 * Build a lightweight DOM helper mock for the file-input handler tests.
 * @param {Record<string, unknown>} [overrides] Optional mock overrides.
 * @returns {Record<string, unknown>} Mock DOM helper object.
 */
function makeDom(overrides = {}) {
  return {
    createElement: jest.fn(tag => ({
      tag,
      _children: [],
      _listeners: {},
    })),
    setClassName: jest.fn((el, className) => {
      el.className = className;
    }),
    setType: jest.fn((el, type) => {
      el.type = type;
    }),
    setValue: jest.fn((el, value) => {
      el.value = value;
    }),
    getCurrentTarget: jest.fn(event => event.currentTarget),
    addEventListener: jest.fn((el, event, handler) => {
      el._listeners[event] = handler;
    }),
    removeEventListener: jest.fn(),
    querySelector: jest.fn(() => null),
    getNextSibling: jest.fn(() => null),
    insertBefore: jest.fn((parent, child) => {
      parent._children.push(child);
    }),
    hide: jest.fn(),
    disable: jest.fn(),
    reveal: jest.fn(),
    enable: jest.fn(),
    ...overrides,
  };
}

describe('fileHandler', () => {
  it('creates a file input and loads uploaded contents into the hidden text input', async () => {
    const dom = makeDom();
    const container = { _children: [] };
    const textInput = { value: '' };

    fileHandler(dom, container, textInput);

    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);
    expect(dom.createElement).toHaveBeenCalledWith('input');

    const fileInput = dom.createElement.mock.results[0].value;
    expect(fileInput.type).toBe('file');
    expect(fileInput.className).toBe('toy-file-input');
    expect(fileInput.accept).toBe('.csv,text/csv,text/plain');
    expect(dom.reveal).toHaveBeenCalledWith(fileInput);
    expect(dom.enable).toHaveBeenCalledWith(fileInput);

    const file = {
      text: jest.fn(async () => 'bookingDate,amount\n2026-03-30,12.50'),
    };
    fileInput.files = [file];

    await fileInput._listeners.change({
      currentTarget: fileInput,
    });

    expect(file.text).toHaveBeenCalledTimes(1);
    expect(dom.setValue).toHaveBeenCalledWith(
      textInput,
      'bookingDate,amount\n2026-03-30,12.50'
    );
    expect(readStoredOrElementValue(textInput)).toBe(
      'bookingDate,amount\n2026-03-30,12.50'
    );
  });

  it('ignores a change event when no file is selected', async () => {
    const dom = makeDom();
    const container = { _children: [] };
    const textInput = { value: '' };

    fileHandler(dom, container, textInput);
    const fileInput = dom.createElement.mock.results[0].value;
    fileInput.files = [];

    await fileInput._listeners.change({
      currentTarget: fileInput,
    });

    expect(dom.setValue).not.toHaveBeenCalledWith(
      textInput,
      expect.any(String)
    );
    expect(readStoredOrElementValue(textInput)).toBe('');
  });
});
