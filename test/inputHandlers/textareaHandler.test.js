import { describe, test, expect, jest } from '@jest/globals';
import { textareaHandler } from '../../src/inputHandlers/textarea.js';

describe('textareaHandler', () => {
  test('creates textarea, removes other inputs, and syncs values', () => {
    const container = { insertBefore: jest.fn() };
    const textInput = {};
    const numberInput = { _dispose: jest.fn() };
    const kvContainer = { _dispose: jest.fn() };
    const dendriteForm = { _dispose: jest.fn() };
    const textareaElement = {};
    const nextSibling = {};
    const removeChild = jest.fn();
    const removeEventListener = jest.fn();

    const selectorMap = new Map([
      ['input[type="number"]', numberInput],
      ['.kv-container', kvContainer],
      ['.dendrite-form', dendriteForm],
      ['.toy-textarea', null],
    ]);

    const dom = {
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector: jest.fn((_, selector) => selectorMap.get(selector)),
      removeChild,
      createElement: jest.fn(() => textareaElement),
      setClassName: jest.fn(),
      getNextSibling: jest.fn(() => nextSibling),
      insertBefore: jest.fn(),
      getValue: jest.fn(() => 'line1\nline2'),
      setValue: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener,
      reveal: jest.fn(),
      enable: jest.fn(),
      getTargetValue: jest.fn(() => 'updated value'),
    };

    textareaHandler(dom, container, textInput);

    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);
    expect(numberInput._dispose).toHaveBeenCalled();
    expect(kvContainer._dispose).toHaveBeenCalled();
    expect(dendriteForm._dispose).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalledWith(container, numberInput);
    expect(removeChild).toHaveBeenCalledWith(container, kvContainer);
    expect(removeChild).toHaveBeenCalledWith(container, dendriteForm);
    expect(dom.createElement).toHaveBeenCalledWith('textarea');
    expect(dom.setClassName).toHaveBeenCalledWith(
      textareaElement,
      'toy-textarea'
    );
    expect(dom.insertBefore).toHaveBeenCalledWith(
      container,
      textareaElement,
      nextSibling
    );
    expect(dom.setValue).toHaveBeenCalledWith(textareaElement, 'line1\nline2');
    expect(dom.reveal).toHaveBeenCalledWith(textareaElement);
    expect(dom.enable).toHaveBeenCalledWith(textareaElement);

    const [, , inputHandler] = dom.addEventListener.mock.calls[0];
    inputHandler({ target: textareaElement });
    expect(dom.getTargetValue).toHaveBeenCalledWith({
      target: textareaElement,
    });
    expect(dom.setValue).toHaveBeenCalledWith(textInput, 'updated value');

    expect(typeof textareaElement._dispose).toBe('function');
    textareaElement._dispose();
    expect(removeEventListener).toHaveBeenCalledWith(
      textareaElement,
      'input',
      inputHandler
    );
  });

  test('reuses existing textarea and updates value', () => {
    const container = {};
    const textInput = {};
    const existingTextarea = {};

    const dom = {
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector: jest
        .fn()
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(existingTextarea),
      removeChild: jest.fn(),
      createElement: jest.fn(),
      setClassName: jest.fn(),
      getNextSibling: jest.fn(),
      insertBefore: jest.fn(),
      getValue: jest.fn(() => 'persisted'),
      setValue: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      reveal: jest.fn(),
      enable: jest.fn(),
    };

    textareaHandler(dom, container, textInput);

    expect(dom.createElement).not.toHaveBeenCalled();
    expect(dom.setValue).toHaveBeenCalledWith(existingTextarea, 'persisted');
    expect(dom.reveal).toHaveBeenCalledWith(existingTextarea);
    expect(dom.enable).toHaveBeenCalledWith(existingTextarea);
  });
});
