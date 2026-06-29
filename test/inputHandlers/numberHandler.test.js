import { describe, test, expect, jest } from '@jest/globals';
import {
  createNumberInput,
  ensureNumberInput,
  numberHandler,
} from '../../src/core/browser/inputHandlers/number.js';

describe('numberHandler', () => {
  test('removes kv and dendrite elements and leaves existing number input', () => {
    const container = {};
    const textInput = {};
    const numberInput = {};
    const kvContainer = { _dispose: jest.fn() };
    const dendriteForm = { _dispose: jest.fn() };
    const textarea = { _dispose: jest.fn() };
    const selectorMap = new Map([
      ['.kv-container', kvContainer],
      ['.dendrite-form', dendriteForm],
      ['.toy-textarea', textarea],
      ['input[type="number"]', numberInput],
    ]);
    const querySelector = jest.fn((el, selector) => selectorMap.get(selector));
    const removeChild = jest.fn();
    const dom = {
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector,
      removeChild,
      // methods used by ensureNumberInput when number input exists are none
    };

    numberHandler(dom, container, textInput);

    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);
    expect(kvContainer._dispose).toHaveBeenCalled();
    expect(dendriteForm._dispose).toHaveBeenCalled();
    expect(textarea._dispose).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalledWith(container, kvContainer);
    expect(removeChild).toHaveBeenCalledWith(container, dendriteForm);
    expect(removeChild).toHaveBeenCalledWith(container, textarea);
    expect(querySelector).toHaveBeenCalledWith(
      container,
      'input[type="number"]'
    );
  });

  test('no elements to remove', () => {
    const numberInput = {};
    const querySelector = jest.fn((_, selector) => {
      if (selector === 'input[type="number"]') {
        return numberInput;
      }
      return null;
    });
    const dom = {
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector,
      removeChild: jest.fn(),
    };

    numberHandler(dom, {}, {});

    expect(dom.removeChild).not.toHaveBeenCalled();
    expect(querySelector).toHaveBeenCalledWith({}, 'input[type="number"]');
  });

  test('ignores elements without dispose methods', () => {
    const kvContainer = {};
    const dendriteForm = {};
    const textarea = {};
    const selectorMap = new Map([
      ['.kv-container', kvContainer],
      ['.dendrite-form', dendriteForm],
      ['.toy-textarea', textarea],
      ['input[type="number"]', {}],
    ]);
    const querySelector = jest.fn((_, selector) => selectorMap.get(selector));
    const dom = {
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector,
      removeChild: jest.fn(),
    };

    numberHandler(dom, {}, {});

    expect(dom.removeChild).not.toHaveBeenCalled();
  });

  test('creates a number input and skips falsey initial values', () => {
    const createdInput = {};
    const dom = {
      createElement: jest.fn(() => createdInput),
      setType: jest.fn(),
      setValue: jest.fn(),
      addEventListener: jest.fn(),
      getTargetValue: jest.fn(),
    };
    const onChange = jest.fn();

    createNumberInput(7, onChange, dom);
    createNumberInput(0, onChange, dom);

    expect(dom.createElement).toHaveBeenCalledWith('input');
    expect(dom.setType).toHaveBeenCalledWith(createdInput, 'number');
    expect(dom.setValue).toHaveBeenCalledWith(createdInput, 7);
    expect(onChange).not.toHaveBeenCalled();
  });

  test('skips setting the number input value when it is falsey', () => {
    const createdInput = {};
    const dom = {
      createElement: jest.fn(() => createdInput),
      setType: jest.fn(),
      setValue: jest.fn(),
      addEventListener: jest.fn(),
      getTargetValue: jest.fn(),
    };
    const onChange = jest.fn();

    createNumberInput('', onChange, dom);

    expect(dom.setValue).not.toHaveBeenCalledWith(createdInput, '');
  });

  test('ensures a number input when one does not already exist', () => {
    const createdInput = {};
    const dom = {
      querySelector: jest.fn(() => null),
      getNextSibling: jest.fn(() => null),
      insertBefore: jest.fn(),
      createElement: jest.fn(() => createdInput),
      setType: jest.fn(),
      setValue: jest.fn(),
      addEventListener: jest.fn(),
      getTargetValue: jest.fn(() => '42'),
    };
    const container = {};
    const textInput = { value: '11' };

    const ensuredInput = ensureNumberInput(container, textInput, dom);
    const inputListener = dom.addEventListener.mock.calls[0][2];
    inputListener({ target: { value: '42' } });

    expect(ensuredInput).toBe(createdInput);
    expect(dom.setType).toHaveBeenCalledWith(createdInput, 'number');
    expect(dom.setValue).toHaveBeenCalledWith(createdInput, '11');
    expect(dom.setValue).toHaveBeenCalledWith(textInput, '42');
    expect(dom.addEventListener).toHaveBeenCalledWith(
      createdInput,
      'input',
      expect.any(Function)
    );
    expect(dom.getTargetValue).toHaveBeenCalled();
  });
});
