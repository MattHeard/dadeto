import { describe, expect, jest, test } from '@jest/globals';
import {
  buildManagedForm,
  finalizeManagedForm,
} from '../../../../src/core/browser/inputHandlers/createDendriteHandler.js';

function createDom() {
  return {
    createElement: jest.fn(tag => ({ tagName: tag.toUpperCase() })),
    getNextSibling: jest.fn(() => null),
    insertBefore: jest.fn((parent, child) => {
      parent.children = parent.children || [];
      parent.children.push(child);
      return child;
    }),
    appendChild: jest.fn((parent, child) => {
      parent.children = parent.children || [];
      parent.children.push(child);
      return child;
    }),
    setClassName: jest.fn((node, className) => {
      node.className = className;
    }),
    setTextContent: jest.fn((node, text) => {
      node.textContent = text;
    }),
    setValue: jest.fn((node, value) => {
      node.value = value;
    }),
    getValue: jest.fn(() => 'value'),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelector: jest.fn(() => null),
  };
}

describe('createDendriteHandler', () => {
  test('returns the raw form element when buildFormContent returns an element', () => {
    const dom = createDom();
    const container = { children: [] };
    const textInput = { value: '' };
    const form = { tagName: 'FORM' };

    const result = buildManagedForm({ dom, container, textInput }, () => form);

    expect(result).toBe(form);
  });

  test('finalizes the form when buildFormContent returns form data and a form', () => {
    const dom = createDom();
    const container = { children: [] };
    const textInput = { value: '' };
    const form = { tagName: 'FORM' };

    const result = buildManagedForm(
      { dom, container, textInput },
      shell => {
        expect(shell.form).toBeDefined();
        return {
          data: { hello: 'world' },
          form,
        };
      }
    );

    expect(result).toBe(form);
    expect(dom.setValue).toHaveBeenCalledWith(textInput, '{"hello":"world"}');
  });

  test('finalizeManagedForm mirrors the form when called directly', () => {
    const dom = createDom();
    const form = { tagName: 'FORM' };
    const textInput = { value: '' };

    expect(
      finalizeManagedForm({
        dom,
        textInput,
        data: { hello: 'world' },
        form,
      })
    ).toBe(form);
  });
});
