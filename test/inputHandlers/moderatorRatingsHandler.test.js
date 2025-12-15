import {
  normalizeRatingEntry,
  serializeRatingRows,
  moderatorRatingsHandler,
} from '../../src/core/browser/inputHandlers/moderatorRatings.js';
import { clearInputValue } from '../../src/core/browser/inputValueStore.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('normalizeRatingEntry', () => {
  test('returns defaults for invalid or missing entries', () => {
    expect(normalizeRatingEntry(null)).toEqual({
      moderatorId: '',
      variantId: '',
      ratedAt: '',
      isApproved: false,
    });
    expect(
      normalizeRatingEntry({
        moderatorId: '  mod-alpha ',
        variantId: ' variant ',
        ratedAt: '2025-01-01T00:00:00Z',
        isApproved: 'true',
      })
    ).toEqual({
      moderatorId: 'mod-alpha',
      variantId: 'variant',
      ratedAt: '2025-01-01T00:00:00Z',
      isApproved: true,
    });
    expect(
      normalizeRatingEntry({
        moderatorId: 'mod-beta',
        variantId: 'variant',
        ratedAt: '',
        isApproved: false,
      })
    ).toEqual({
      moderatorId: 'mod-beta',
      variantId: 'variant',
      ratedAt: '',
      isApproved: false,
    });
  });
});

describe('serializeRatingRows', () => {
  test('applies normalization to every row', () => {
    const rows = [
      {
        moderatorId: ' mod-a ',
        variantId: 'variant',
        ratedAt: '2025-02-02T00:00:00Z',
        isApproved: 'true',
      },
      {
        moderatorId: 'mod-b',
        variantId: null,
        ratedAt: undefined,
        isApproved: false,
      },
    ];

    expect(serializeRatingRows(rows)).toEqual([
      {
        moderatorId: 'mod-a',
        variantId: 'variant',
        ratedAt: '2025-02-02T00:00:00Z',
        isApproved: true,
      },
      {
        moderatorId: 'mod-b',
        variantId: '',
        ratedAt: '',
        isApproved: false,
      },
    ]);
  });
});

/**
 *
 */
function createFakeDom() {
  const created = [];

  const addEventListener = jest.fn((element, event, handler) => {
    element.listeners = element.listeners ?? {};
    element.listeners[event] = element.listeners[event] ?? [];
    element.listeners[event].push(handler);
  });

  const removeEventListener = jest.fn((element, event, handler) => {
    if (!element.listeners?.[event]) {
      return;
    }
    element.listeners[event] = element.listeners[event].filter(
      existing => existing !== handler
    );
  });

  const makeElement = tag => {
    const element = {
      tag,
      children: [],
      value: '',
      attributes: {},
      listeners: {},
      placeholder: '',
      className: '',
      textContent: '',
    };
    created.push(element);
    return element;
  };

  return {
    createdElements: created,
    hide: jest.fn(),
    disable: jest.fn(),
    querySelector: jest.fn(() => null),
    removeChild: jest.fn(),
    createElement: jest.fn(makeElement),
    setClassName: jest.fn((element, className) => {
      element.className = className;
    }),
    appendChild: jest.fn((parent, child) => {
      parent.children = parent.children ?? [];
      parent.children.push(child);
    }),
    insertBefore: jest.fn(),
    getNextSibling: jest.fn(() => null),
    setType: jest.fn((element, type) => {
      element.type = type;
    }),
    setPlaceholder: jest.fn((element, placeholder) => {
      element.placeholder = placeholder;
    }),
    setValue: jest.fn((element, value) => {
      element.value = value;
    }),
    getValue: jest.fn(element => element.value),
    addEventListener,
    removeEventListener,
    reveal: jest.fn(),
    setTextContent: jest.fn((element, text) => {
      element.textContent = text;
    }),
    enable: jest.fn(),
  };
}

describe('moderatorRatingsHandler', () => {
  test('initializes a form and persists a default row', () => {
    const textInput = { value: '' };
    const dom = createFakeDom();
    const container = {};

    moderatorRatingsHandler(dom, container, textInput);

    const setValueCalls = dom.setValue.mock.calls.filter(
      ([element]) => element === textInput
    );
    expect(setValueCalls.length).toBeGreaterThanOrEqual(1);

    const lastValue = setValueCalls[setValueCalls.length - 1][1];
    expect(lastValue).toBe(
      '[{"moderatorId":"","variantId":"","ratedAt":"","isApproved":false}]'
    );

    clearInputValue(textInput);
  });

  test('resets to a default row when stored JSON is not an array', () => {
    const textInput = { value: '{"moderator":"modx"}' };
    const dom = createFakeDom();
    const container = {};

    moderatorRatingsHandler(dom, container, textInput);

    const setValueCalls = dom.setValue.mock.calls.filter(
      ([element]) => element === textInput
    );
    const lastValue = setValueCalls[setValueCalls.length - 1][1];
    expect(lastValue).toBe(
      '[{"moderatorId":"","variantId":"","ratedAt":"","isApproved":false}]'
    );

    clearInputValue(textInput);
  });

  test('keeps hidden input synchronized as rows change', () => {
    const textInput = { value: '' };
    const dom = createFakeDom();
    const container = {};

    moderatorRatingsHandler(dom, container, textInput);

    const findInput = placeholder =>
      dom.createdElements.find(
        element =>
          element.tag === 'input' && element.placeholder === placeholder
      );
    const findButton = label =>
      dom.createdElements.find(
        element => element.tag === 'button' && element.textContent === label
      );

    const authorInput = findInput('Moderator ID');
    const variantInput = findInput('Variant ID');
    const ratedAtInput = findInput('ratedAt (ISO 8601)');
    const approveSelect = dom.createdElements.find(
      element => element.tag === 'select'
    );
    const addButton = findButton('Add rating');

    expect(authorInput).toBeDefined();
    expect(variantInput).toBeDefined();
    expect(ratedAtInput).toBeDefined();
    expect(approveSelect).toBeDefined();
    expect(addButton).toBeDefined();

    authorInput.value = '  mod-action  ';
    authorInput.listeners.input[0]();
    expect(textInput.value).toContain('"moderatorId":"mod-action"');

    variantInput.value = ' variant-x ';
    variantInput.listeners.input[0]();
    expect(textInput.value).toContain('"variantId":"variant-x"');

    ratedAtInput.value = '2025-12-01T12:00:00Z';
    ratedAtInput.listeners.input[0]();
    expect(textInput.value).toContain('"ratedAt":"2025-12-01T12:00:00Z"');

    approveSelect.value = 'true';
    approveSelect.listeners.change[0]();
    expect(textInput.value).toContain('"isApproved":true');

    addButton.listeners.click[0]();

    const removeButtons = dom.createdElements.filter(
      element =>
        element.tag === 'button' && element.textContent === 'Remove rating'
    );
    expect(removeButtons.length).toBeGreaterThanOrEqual(2);

    const newRowRemove = removeButtons[removeButtons.length - 1];
    newRowRemove.listeners.click[0]();
    expect(dom.removeChild).toHaveBeenCalled();

    const form = dom.insertBefore.mock.calls[0]?.[1];
    expect(form).toBeDefined();
    form._dispose();

    clearInputValue(textInput);
  });
});
