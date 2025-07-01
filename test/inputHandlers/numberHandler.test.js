import { describe, test, expect, jest } from '@jest/globals';
import { numberHandler } from '../../src/inputHandlers/number.js';

describe('numberHandler', () => {
  test('removes kv and dendrite elements and leaves existing number input', () => {
    const container = {};
    const textInput = {};
    const numberInput = {};
    const kvContainer = { _dispose: jest.fn() };
    const dendriteForm = { _dispose: jest.fn() };
    const selectorMap = new Map([
      ['.kv-container', kvContainer],
      ['.dendrite-form', dendriteForm],
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
    expect(removeChild).toHaveBeenCalledWith(container, kvContainer);
    expect(removeChild).toHaveBeenCalledWith(container, dendriteForm);
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
    const selectorMap = new Map([
      ['.kv-container', kvContainer],
      ['.dendrite-form', dendriteForm],
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
});
