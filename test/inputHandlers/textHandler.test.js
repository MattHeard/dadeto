import { textHandler } from '../../src/inputHandlers/text.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('textHandler', () => {
  test('removes number, kv and dendrite inputs', () => {
    const container = {};
    const textInput = {};
    const numberInput = { _dispose: jest.fn() };
    const kvContainer = { _dispose: jest.fn() };
    const dendriteForm = { _dispose: jest.fn() };
    const querySelector = jest.fn((el, selector) => {
      const mapping = {
        'input[type="number"]': numberInput,
        '.kv-container': kvContainer,
        '.dendrite-form': dendriteForm,
      };
      return mapping[selector] ?? null;
    });
    const dom = {
      reveal: jest.fn(),
      enable: jest.fn(),
      querySelector,
      removeChild: jest.fn(),
    };

    textHandler(dom, container, textInput);

    expect(dom.reveal).toHaveBeenCalledWith(textInput);
    expect(dom.enable).toHaveBeenCalledWith(textInput);
    expect(numberInput._dispose).toHaveBeenCalled();
    expect(kvContainer._dispose).toHaveBeenCalled();
    expect(dendriteForm._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith(container, numberInput);
    expect(dom.removeChild).toHaveBeenCalledWith(container, kvContainer);
    expect(dom.removeChild).toHaveBeenCalledWith(container, dendriteForm);
  });

  test('does nothing when elements missing', () => {
    const dom = {
      reveal: jest.fn(),
      enable: jest.fn(),
      querySelector: jest.fn(() => null),
      removeChild: jest.fn(),
    };

    textHandler(dom, {}, {});

    expect(dom.removeChild).not.toHaveBeenCalled();
  });

  test('ignores elements without dispose methods', () => {
    const numberInput = {};
    const kvContainer = {};
    const dendriteForm = {};
    const querySelector = jest.fn((_, selector) => {
      const mapping = {
        'input[type="number"]': numberInput,
        '.kv-container': kvContainer,
        '.dendrite-form': dendriteForm,
      };
      return mapping[selector] ?? null;
    });
    const dom = {
      reveal: jest.fn(),
      enable: jest.fn(),
      querySelector,
      removeChild: jest.fn(),
    };

    textHandler(dom, {}, {});

    expect(dom.removeChild).not.toHaveBeenCalled();
  });
});
