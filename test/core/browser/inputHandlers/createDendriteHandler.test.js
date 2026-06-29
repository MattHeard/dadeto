import { describe, expect, jest, test } from '@jest/globals';
import {
  buildManagedForm,
  cleanContainer,
  createDendriteHandler,
  createManagedFormShell,
  createManagedFormShellState,
  finalizeManagedForm,
  removeExistingForm,
  runContainerRemovers,
  runFormHandler,
  syncHiddenInput,
  withManagedFormShell,
  disposeIfPossible,
} from '../../../../src/core/browser/inputHandlers/createDendriteHandler.js';

/**
 * Create a minimal DOM adapter for handler tests.
 * @returns {{
 *   createElement: jest.Mock,
 *   getNextSibling: jest.Mock,
 *   insertBefore: jest.Mock,
 *   appendChild: jest.Mock,
 *   setClassName: jest.Mock,
 *   setTextContent: jest.Mock,
 *   setValue: jest.Mock,
 *   getValue: jest.Mock,
 *   addEventListener: jest.Mock,
 *   removeEventListener: jest.Mock,
 *   querySelector: jest.Mock,
 * }} Minimal DOM adapter.
 */
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
    removeChild: jest.fn((parent, child) => {
      parent.children = (parent.children || []).filter(node => node !== child);
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
    setPlaceholder: jest.fn((node, value) => {
      node.placeholder = value;
    }),
    setType: jest.fn((node, value) => {
      node.type = value;
    }),
    hide: jest.fn(),
    disable: jest.fn(),
    getValue: jest.fn(() => 'value'),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelector: jest.fn(() => null),
  };
}

describe('createDendriteHandler', () => {
  test('disposes nodes only when a dispose hook exists', () => {
    const dispose = jest.fn();

    disposeIfPossible({ _dispose: dispose });
    disposeIfPossible({});

    expect(dispose).toHaveBeenCalledTimes(1);
  });

  test('removes an existing form when one is present', () => {
    const dom = createDom();
    const form = { tagName: 'FORM', _dispose: jest.fn() };
    dom.querySelector.mockReturnValue(form);
    const container = { children: [] };

    removeExistingForm(container, dom);

    expect(dom.removeChild).toHaveBeenCalledWith(container, form);
    expect(form._dispose).toHaveBeenCalled();
  });

  test('syncs hidden input through both setter paths', () => {
    const dom = createDom();
    const textInput = { value: '' };

    syncHiddenInput(dom, textInput, { hello: 'world' });

    expect(dom.setValue).toHaveBeenCalledWith(textInput, '{"hello":"world"}');
  });

  test('creates and tracks a managed form shell', () => {
    const dom = createDom();
    const container = { children: [] };
    const textInput = { value: '' };
    const shell = createManagedFormShell({
      dom,
      container,
      textInput,
      disposers: [jest.fn()],
    });

    expect(dom.createElement).toHaveBeenCalledWith('div');
    expect(dom.setClassName).toHaveBeenCalled();
    expect(shell._dispose).toEqual(expect.any(Function));
  });

  test('returns shell state from createManagedFormShellState and withManagedFormShell', () => {
    const dom = createDom();
    const container = { children: [] };
    const textInput = { value: '' };

    const state = createManagedFormShellState({ dom, container, textInput });
    expect(state.form).toBeDefined();
    expect(state.disposers).toEqual([]);

    const result = withManagedFormShell(
      { dom, container, textInput },
      shell => shell.form
    );
    expect(result).toBeDefined();
  });

  test('runs container removers and the form handler path', () => {
    const dom = createDom();
    const container = { children: [] };
    const textInput = { value: '' };
    const remover = jest.fn();
    const buildForm = jest.fn(() => ({ tagName: 'FORM' }));

    runContainerRemovers(container, dom, [remover]);
    expect(remover).toHaveBeenCalledWith(container, dom);

    expect(
      runFormHandler({ dom, container, textInput, buildForm })
    ).toEqual({ tagName: 'FORM' });
  });

  test('creates a dendrite handler and renders fields', () => {
    const dom = createDom();
    const container = { children: [] };
    const textInput = { value: '{"alpha":"beta"}' };
    const handler = createDendriteHandler([['alpha', 'Alpha']]);

    const result = handler(dom, container, textInput);

    expect(result).toBeDefined();
    expect(dom.setPlaceholder).toHaveBeenCalled?.();
  });

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

    const result = buildManagedForm({ dom, container, textInput }, shell => {
      expect(shell.form).toBeDefined();
      return {
        data: { hello: 'world' },
        form,
      };
    });

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
