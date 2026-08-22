import { describe, expect, test, jest } from '@jest/globals';
import {
  objectMinuteAssetHandler,
  possessionRequestHandler,
} from '../../../../src/core/browser/inputHandlers/objectMinuteForms.js';

/**
 * Create the DOM facade used by the handler tests.
 * @returns {object} Mock DOM facade.
 */
function createDom() {
  return {
    createElement: jest.fn(tag => {
      const node = { tagName: tag, children: [], type: '', value: '' };
      node.querySelectorAll = jest.fn(selector =>
        selector === 'input'
          ? node.children.map(row => row.children?.[1]).filter(Boolean)
          : []
      );
      return node;
    }),
    setClassName: jest.fn((node, value) => {
      node.className = value;
    }),
    setTextContent: jest.fn((node, value) => {
      node.textContent = value;
    }),
    appendChild: jest.fn((parent, child) => {
      parent.children.push(child);
      return child;
    }),
    getValue: jest.fn(node => node.value),
    setValue: jest.fn((node, value) => {
      node.value = value;
    }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    hide: jest.fn(),
    disable: jest.fn(),
    querySelector: jest.fn(() => null),
    removeChild: jest.fn(),
  };
}

describe('object-minute structured input handlers', () => {
  test('renders an asset form, restores values, and serializes edits', () => {
    const dom = createDom();
    const container = { children: [] };
    const textInput = {
      value: JSON.stringify({ assetId: 'A-1', resetRequired: false }),
    };

    objectMinuteAssetHandler(dom, container, textInput);

    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);
    expect(dom.createElement.mock.calls.map(([tag]) => tag)).toEqual([
      'div',
      'label',
      'span',
      'input',
      'label',
      'span',
      'input',
      'label',
      'span',
      'input',
      'label',
      'span',
      'input',
      'label',
      'span',
      'input',
      'label',
      'span',
      'input',
      'label',
      'span',
      'input',
      'label',
      'span',
      'input',
      'label',
      'span',
      'input',
    ]);
    const form = container.children[0];
    expect(form.className).toBe('object-minute-form');
    expect(form.children).toHaveLength(9);
    expect(
      form.children.map(row => [
        row.children[0].textContent,
        row.children[1].type,
      ])
    ).toEqual([
      ['Asset ID', 'text'],
      ['SKU', 'text'],
      ['Name', 'text'],
      ['Storage location', 'text'],
      ['Condition', 'text'],
      ['Availability', 'text'],
      ['Owner', 'text'],
      ['Reset required', 'checkbox'],
      ['Notes', 'text'],
    ]);
    expect(form.children[0].children[1].value).toBe('A-1');
    expect(form.children[7].children[1].checked).toBe(false);
    expect(form.children[7].children[1].value).toBe('');
    expect(
      form.children
        .slice(0, 7)
        .every(row => !Object.hasOwn(row.children[1], 'checked'))
    ).toBe(true);
    expect(Object.hasOwn(form.children[8].children[1], 'checked')).toBe(false);
    expect(
      form.children.slice(1).filter(row => row.children[1].value === '').length
    ).toBe(8);
    expect(JSON.parse(textInput.value)).toEqual({
      assetId: 'A-1',
      sku: '',
      name: '',
      storageLocation: '',
      condition: '',
      availability: '',
      owner: '',
      resetRequired: false,
      notes: '',
    });

    const trueDom = createDom();
    const trueContainer = { children: [] };
    objectMinuteAssetHandler(trueDom, trueContainer, {
      value: JSON.stringify({ resetRequired: true }),
    });
    expect(trueContainer.children[0].children[7].children[1].checked).toBe(
      true
    );
  });

  test('serializes number fields as numbers and blank numbers as null', () => {
    const dom = createDom();
    const container = { children: [] };
    const textInput = { value: '{}' };

    possessionRequestHandler(dom, container, textInput);
    const form = container.children[0];
    expect(
      form.children.map(row => [
        row.children[0].textContent,
        row.children[1].type,
      ])
    ).toEqual([
      ['SKU', 'text'],
      ['Delivery latitude', 'number'],
      ['Delivery longitude', 'number'],
      ['Delivery time (UTC)', 'text'],
      ['Pickup latitude', 'number'],
      ['Pickup longitude', 'number'],
      ['Pickup time (UTC)', 'text'],
    ]);
    form.children[1].children[1].value = '52.5';
    form.children[2].children[1].value = '';
    form.children[3].children[1].value = '2026-08-22T12:00';
    dom.addEventListener.mock.calls[0][2]();
    form._dispose();

    expect(dom.removeEventListener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(textInput.value)).toEqual({
      sku: '',
      deliveryLocation: { lat: 52.5, lon: null },
      deliveryTime: '2026-08-22T12:00',
      pickupLocation: { lat: null, lon: null },
      pickupTime: '',
    });
  });

  test('uses empty values when the initial structured value is invalid', () => {
    const dom = createDom();
    const container = { children: [] };
    possessionRequestHandler(dom, container, { value: 'not-json' });
    expect(container.children[0].children[0].children[1].value).toBe('');
  });

  test('removes and disposes an existing form before replacement', () => {
    const dom = createDom();
    const oldForm = { _dispose: jest.fn() };
    dom.querySelector.mockReturnValue(oldForm);
    const container = { children: [oldForm] };

    objectMinuteAssetHandler(dom, container, { value: '{}' });

    expect(oldForm._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith(container, oldForm);
  });

  test('removes an existing form even when it has no disposer', () => {
    const dom = createDom();
    const oldForm = {};
    dom.querySelector.mockReturnValue(oldForm);

    expect(() =>
      possessionRequestHandler(dom, { children: [] }, { value: '{}' })
    ).not.toThrow();
  });
});
